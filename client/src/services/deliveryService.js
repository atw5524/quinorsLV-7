// services/deliveryService.js
import api from './api';

export const deliveryService = {
  createDelivery: async (deliveryData) => {
    const response = await api.post('/delivery', deliveryData);
    return response.data;
  },

  getDeliveries: async () => {
    const response = await api.get('/delivery');
    return response.data;
  },

  updateDelivery: async (id, updateData) => {
    const response = await api.put(`/delivery/${id}`, updateData);
    return response.data;
  }
};