from django.conf import settings
from django.db.models import F
import logging
import uuid

from rest_framework import generics, permissions, status
from rest_framework.response import Response
from rest_framework.views import APIView

from apps.bookings.models import Booking
from apps.products.models import Order
from apps.veterinary.models import EmergencyRequest

from .bkash_utils import BKashUtility
from .models import Payment
from .serializers import PaymentSerializer

logger = logging.getLogger(__name__)


class PaymentListCreateView(generics.ListCreateAPIView):
    serializer_class = PaymentSerializer
    permission_classes = [permissions.IsAuthenticated]

    def get_queryset(self):
        return Payment.objects.filter(user=self.request.user).order_by('-created_at')

    def perform_create(self, serializer):
        payment = serializer.save()
        if payment.method == 'cash':
            payment.status = 'completed'
            payment.transaction_id = f"CASH-{uuid.uuid4().hex[:12].upper()}"
            payment.save()

            if payment.booking:
                payment.booking.payment_status = 'paid'
                payment.booking.save(update_fields=['payment_status'])

            if payment.order:
                payment.order.payment_status = 'paid'
                payment.order.status = 'paid'
                payment.order.save(update_fields=['payment_status', 'status'])

                for item in payment.order.items.all():
                    if item.product:
                        item.product.stock = F('stock') - item.quantity
                        item.product.save(update_fields=['stock'])

            if payment.emergency_request:
                payment.emergency_request.payment_status = 'paid'
                payment.emergency_request.save(update_fields=['payment_status'])


class PaymentDetailView(generics.RetrieveAPIView):
    serializer_class = PaymentSerializer
    permission_classes = [permissions.IsAuthenticated]

    def get_queryset(self):
        return Payment.objects.filter(user=self.request.user)


class PaymentWebhookView(APIView):
    """Mock webhook for payment gateway confirmations."""
    permission_classes = [permissions.AllowAny]

    def post(self, request):
        transaction_id = request.data.get('transaction_id')
        payment_status = request.data.get('status', 'completed')
        try:
            payment = Payment.objects.get(transaction_id=transaction_id)
            payment.status = payment_status
            payment.gateway_response = request.data
            payment.save()
            if payment_status == 'completed' and payment.booking:
                payment.booking.payment_status = 'paid'
                payment.booking.save(update_fields=['payment_status'])
            return Response({'detail': 'Webhook processed.'})
        except Payment.DoesNotExist:
            return Response({'detail': 'Payment not found.'}, status=404)


class BKashCreatePaymentView(APIView):
    permission_classes = [permissions.IsAuthenticated]

    def post(self, request):
        booking_id = request.data.get('booking_id')
        order_id = request.data.get('order_id')
        emergency_id = request.data.get('emergency_id')

        if not booking_id and not order_id and not emergency_id:
            return Response({'error': 'Booking, Order, or Emergency ID is required.'}, status=400)

        try:
            amount = 0
            booking = None
            order = None
            emergency = None

            if booking_id:
                booking = Booking.objects.get(id=booking_id, user=request.user)
                if booking.payment_status == 'paid':
                    return Response({'error': 'Booking is already paid.'}, status=400)
                amount = booking.total_price
            elif order_id:
                order = Order.objects.get(id=order_id, user=request.user)
                if order.payment_status == 'paid':
                    return Response({'error': 'Order is already paid.'}, status=400)
                amount = order.total_amount
            elif emergency_id:
                emergency = EmergencyRequest.objects.get(id=emergency_id, patient=request.user)
                if emergency.payment_status == 'paid':
                    return Response({'error': 'Emergency consultation is already paid.'}, status=400)
                # Use emergency.amount if it's set, fallback to doctor's emergency_fee
                amount = emergency.amount
                if not amount and emergency.doctor:
                    amount = getattr(emergency.doctor.doctor_profile, 'emergency_fee', 0)
                
                if not amount:
                    return Response({'error': 'No fee set for this emergency consultation.'}, status=400)

            invoice = f"INV-{uuid.uuid4().hex[:8].upper()}"
            callback_url = request.data.get(
                'callback_url',
                f"{settings.FRONTEND_URL}/payment/bkash/callback",
            )

            bkash = BKashUtility()
            if not bkash.credentials_ok():
                return Response(
                    {
                        'error': (
                            'bKash is not configured. Add BKASH_APP_KEY, BKASH_APP_SECRET, '
                            'BKASH_USERNAME, and BKASH_PASSWORD to backend/.env using the keys '
                            'from your bKash Developer / Merchant (sandbox) app.'
                        ),
                    },
                    status=400,
                )

            payment_response = bkash.create_payment(amount, invoice, callback_url)

            if payment_response and payment_response.get('statusCode') == '0000':
                payment = Payment.objects.create(
                    booking=booking,
                    order=order,
                    emergency_request=emergency,
                    user=request.user,
                    amount=amount,
                    method='bkash',
                    payment_id=payment_response.get('paymentID'),
                    status='pending',
                    gateway_response=payment_response,
                )
                return Response({
                    'bkash_url': payment_response.get('bkashURL'),
                    'payment_id': payment.id,
                })

            if payment_response:
                error_msg = (
                    payment_response.get('statusMessage')
                    or payment_response.get('errorMessage')
                    or payment_response.get('message')
                    or str(payment_response)
                )
            else:
                error_msg = (
                    bkash._last_error
                    or 'bKash did not return a valid response. Check server logs and credentials.'
                )
            return Response({'error': error_msg}, status=400)

        except (Booking.DoesNotExist, Order.DoesNotExist, EmergencyRequest.DoesNotExist):
            return Response({'error': 'Record not found.'}, status=404)
        except Exception as e:
            logger.error('bKash Create View Error: %s', e, exc_info=True)
            return Response(
                {'error': 'Something went wrong while initiating payment.'},
                status=500,
            )


class BKashExecutePaymentView(APIView):
    permission_classes = [permissions.IsAuthenticated]

    def post(self, request):
        payment_id_bkash = request.data.get('paymentID')
        if not payment_id_bkash:
            return Response({'error': 'bKash Payment ID is required.'}, status=400)

        try:
            payment = Payment.objects.get(payment_id=payment_id_bkash, user=request.user)
            bkash = BKashUtility()
            execute_response = bkash.execute_payment(payment_id_bkash)

            if execute_response and execute_response.get('statusCode') == '0000':
                payment.status = 'completed'
                payment.transaction_id = execute_response.get('trxID')
                payment.gateway_response = execute_response
                payment.save()

                if payment.booking:
                    payment.booking.payment_status = 'paid'
                    payment.booking.save(update_fields=['payment_status'])

                if payment.order:
                    payment.order.payment_status = 'paid'
                    payment.order.status = 'paid'
                    payment.order.save(update_fields=['payment_status', 'status'])

                    for item in payment.order.items.all():
                        if item.product:
                            item.product.stock = F('stock') - item.quantity
                            item.product.save(update_fields=['stock'])

                if payment.emergency_request:
                    payment.emergency_request.payment_status = 'paid'
                    payment.emergency_request.save(update_fields=['payment_status'])

                # Real-time Broadcast
                from apps.notifications.utils import broadcast_system_event
                from .serializers import PaymentSerializer
                broadcast_system_event(payment.user.id, 'PAYMENT_UPDATE', PaymentSerializer(payment).data)

                return Response({'status': 'success', 'trxID': payment.transaction_id})

            payment.status = 'failed'
            payment.gateway_response = execute_response
            payment.save()

            # Real-time Broadcast (Fail)
            from apps.notifications.utils import broadcast_system_event
            from .serializers import PaymentSerializer
            broadcast_system_event(payment.user.id, 'PAYMENT_UPDATE', PaymentSerializer(payment).data)

            return Response(
                {
                    'status': 'failed',
                    'error': (
                        (execute_response or {}).get('statusMessage')
                        or (execute_response or {}).get('errorMessage')
                        or 'Payment execution failed'
                    ),
                },
                status=400,
            )

        except Payment.DoesNotExist:
            return Response({'error': 'Payment record not found.'}, status=404)
        except Exception as e:
            logger.error('bKash Execute View Error: %s', e, exc_info=True)
            return Response({'error': 'Something went wrong.'}, status=500)
