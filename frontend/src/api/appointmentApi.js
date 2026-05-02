import api from './axiosInstance';

export const getAvailableSlots = (doctorId, date) => api.get(`/api/appointments/bookings/slots/?doctor=${doctorId}&date=${date}`);

export const bookAppointment = (data) => api.post('/api/appointments/bookings/', data);

export const getMyAppointments = () => api.get('/api/appointments/bookings/');

export const approveAppointment = (id) => api.patch(`/api/appointments/bookings/${id}/approve/`);

export const rejectAppointment = (id) => api.patch(`/api/appointments/bookings/${id}/reject/`);

export const completeAppointment = (id) => api.patch(`/api/appointments/bookings/${id}/complete/`);

export const getAvailability = () => api.get('/api/appointments/availability/');

export const updateAvailability = (id, data) => api.patch(`/api/appointments/availability/${id}/`, data);

export const createAvailability = (data) => api.post('/api/appointments/availability/', data);
