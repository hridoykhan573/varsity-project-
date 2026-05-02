from rest_framework import generics, status, permissions
from rest_framework.response import Response
from rest_framework.views import APIView
from django.utils.crypto import get_random_string
from django.utils import timezone
from django.core.mail import send_mail
from datetime import timedelta
from rest_framework_simplejwt.views import TokenObtainPairView
from rest_framework_simplejwt.tokens import RefreshToken
from .models import CustomUser
from .serializers import (
    RegisterSerializer, UserProfileSerializer,
    CustomTokenObtainPairSerializer, UserPublicSerializer,
    ForgotPasswordSerializer, VerifyCodeSerializer, ResetPasswordSerializer,
    ChangePasswordSerializer,
)
from apps.shelters.models import Shelter
from apps.adoptions.models import AdoptionRequest


class CustomLoginView(TokenObtainPairView):
    serializer_class = CustomTokenObtainPairSerializer


class RegisterView(generics.CreateAPIView):
    queryset = CustomUser.objects.all()
    serializer_class = RegisterSerializer
    permission_classes = [permissions.AllowAny]

    def create(self, request, *args, **kwargs):
        serializer = self.get_serializer(data=request.data)
        serializer.is_valid(raise_exception=True)
        user = serializer.save()
        refresh = RefreshToken.for_user(user)
        return Response({
            'user': UserPublicSerializer(user).data,
            'tokens': {
                'refresh': str(refresh),
                'access': str(refresh.access_token),
            }
        }, status=status.HTTP_201_CREATED)


class ProfileView(generics.RetrieveUpdateDestroyAPIView):
    serializer_class = UserProfileSerializer
    permission_classes = [permissions.IsAuthenticated]

    def get_object(self):
        return self.request.user


class LogoutView(APIView):
    permission_classes = [permissions.IsAuthenticated]

    def post(self, request):
        try:
            refresh_token = request.data.get('refresh')
            token = RefreshToken(refresh_token)
            token.blacklist()
            return Response({'detail': 'Logged out successfully.'}, status=status.HTTP_200_OK)
        except Exception:
            return Response({'detail': 'Invalid token.'}, status=status.HTTP_400_BAD_REQUEST)


class UserListView(generics.ListAPIView):
    """Admin only: list all users."""
    queryset = CustomUser.objects.all()
    serializer_class = UserProfileSerializer
    permission_classes = [permissions.IsAdminUser]


class UserDetailView(generics.RetrieveAPIView):
    queryset = CustomUser.objects.all()
    serializer_class = UserPublicSerializer
    permission_classes = [permissions.IsAuthenticatedOrReadOnly]


class ForgotPasswordView(generics.GenericAPIView):
    permission_classes = [permissions.AllowAny]
    serializer_class = ForgotPasswordSerializer

    def post(self, request, *args, **kwargs):
        serializer = self.get_serializer(data=request.data)
        serializer.is_valid(raise_exception=True)
        email = serializer.validated_data['email']
        
        user = CustomUser.objects.filter(email=email).first()
        if user:
            code = get_random_string(length=5, allowed_chars='0123456789')
            user.reset_code = code
            user.reset_code_expires = timezone.now() + timedelta(minutes=10)
            user.save(update_fields=['reset_code', 'reset_code_expires'])
            
            # Send Email
            from django.conf import settings
            now_str = timezone.now().strftime('%Y-%m-%d %H:%M:%S')
            try:
                send_mail(
                    subject="Password Reset Verification Code",
                    message=f"Your password reset authentication code is: {code}\n\nThis code will expire in 10 minutes.\n\n(Requested at: {now_str})",
                    from_email=settings.DEFAULT_FROM_EMAIL,
                    recipient_list=[user.email],
                    fail_silently=False,
                )
            except Exception as e:
                # Log the real error for debugging
                print(f"\n[EMAIL ERROR] {str(e)}\n")
                # Fallback to printing in console
                print(f"\n[CONSOLE FALLBACK] Verification code: {code}\n")
                
        # Always return 200 to prevent email enumeration
        return Response({"detail": "If that email is registered, we have sent a reset code."}, status=status.HTTP_200_OK)


class VerifyCodeView(generics.GenericAPIView):
    permission_classes = [permissions.AllowAny]
    serializer_class = VerifyCodeSerializer

    def post(self, request, *args, **kwargs):
        serializer = self.get_serializer(data=request.data)
        serializer.is_valid(raise_exception=True)
        email = serializer.validated_data['email']
        code = serializer.validated_data['code']
        
        user = CustomUser.objects.filter(email=email).first()
        if not user or user.reset_code != code:
            return Response({"detail": "Invalid verification code."}, status=status.HTTP_400_BAD_REQUEST)
            
        if user.reset_code_expires and timezone.now() > user.reset_code_expires:
            return Response({"detail": "Verification code has expired. Please request a new one."}, status=status.HTTP_400_BAD_REQUEST)
            
        return Response({"detail": "Code is valid."}, status=status.HTTP_200_OK)


class ResetPasswordView(generics.GenericAPIView):
    permission_classes = [permissions.AllowAny]
    serializer_class = ResetPasswordSerializer

    def post(self, request, *args, **kwargs):
        serializer = self.get_serializer(data=request.data)
        serializer.is_valid(raise_exception=True)
        email = serializer.validated_data['email']
        code = serializer.validated_data['code']
        new_password = serializer.validated_data['new_password']
        
        user = CustomUser.objects.filter(email=email).first()
        if not user or user.reset_code != code:
            return Response({"detail": "Invalid verification code."}, status=status.HTTP_400_BAD_REQUEST)
            
        if user.reset_code_expires and timezone.now() > user.reset_code_expires:
            return Response({"detail": "Verification code has expired."}, status=status.HTTP_400_BAD_REQUEST)
            
        # Reset password
        user.set_password(new_password)
        user.reset_code = None
        user.reset_code_expires = None
        user.last_password_change = timezone.now()
        user.save()
        
        return Response({"detail": "Password has been reset successfully."}, status=status.HTTP_200_OK)

class ChangePasswordView(generics.GenericAPIView):
    permission_classes = [permissions.IsAuthenticated]
    serializer_class = ChangePasswordSerializer

    def post(self, request, *args, **kwargs):
        serializer = self.get_serializer(data=request.data)
        serializer.is_valid(raise_exception=True)
        
        user = self.request.user
        current_password = serializer.validated_data.get("current_password")
        new_password = serializer.validated_data.get("new_password")
        
        if not user.check_password(current_password):
            return Response({"detail": "Current password is incorrect."}, status=status.HTTP_400_BAD_REQUEST)
        
        user.set_password(new_password)
        user.last_password_change = timezone.now()
        user.save()
        
        return Response({"detail": "Password has been changed successfully."}, status=status.HTTP_200_OK)

class PublicStatsView(APIView):
    permission_classes = [permissions.AllowAny]

    def get(self, request):
        total_users = CustomUser.objects.count()
        total_shelters = Shelter.objects.count()
        total_adoptions = AdoptionRequest.objects.filter(status='accepted').count()
        
        return Response({
            'total_users': total_users,
            'total_shelters': total_shelters,
            'total_adoptions': total_adoptions
        }, status=status.HTTP_200_OK)

class ToggleOnlineStatusView(APIView):
    permission_classes = [permissions.IsAuthenticated]

    def post(self, request):
        user = request.user
        user.is_available = not user.is_available
        user.save(update_fields=['is_available'])
        return Response({
            'is_online': user.is_online,
            'is_available': user.is_available,
            'detail': f"Emergency portal is now {'enabled' if user.is_available else 'disabled'}."
        }, status=status.HTTP_200_OK)
