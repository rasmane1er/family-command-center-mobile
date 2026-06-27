import * as SecureStore from 'expo-secure-store';

export const secureStorage = {
  setToken: async (key: string, value: string) => {
    await SecureStore.setItemAsync(key, value);
  },

  getToken: async (key: string) => {
    return await SecureStore.getItemAsync(key);
  },

  removeToken: async (key: string) => {
    await SecureStore.deleteItemAsync(key);
  },
};