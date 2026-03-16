// Web-compatible AsyncStorage implementation using localStorage
const AsyncStorage = {
  async getItem(key: string): Promise<string | null> {
    try {
      return localStorage.getItem(key);
    } catch (error) {
      console.error('AsyncStorage getItem error:', error);
      return null;
    }
  },

  async setItem(key: string, value: string): Promise<void> {
    try {
      localStorage.setItem(key, value);
    } catch (error) {
      console.error('AsyncStorage setItem error:', error);
      throw error;
    }
  },

  async removeItem(key: string): Promise<void> {
    try {
      localStorage.removeItem(key);
    } catch (error) {
      console.error('AsyncStorage removeItem error:', error);
      throw error;
    }
  },

  async clear(): Promise<void> {
    try {
      localStorage.clear();
    } catch (error) {
      console.error('AsyncStorage clear error:', error);
      throw error;
    }
  },

  async getAllKeys(): Promise<string[]> {
    try {
      return Object.keys(localStorage);
    } catch (error) {
      console.error('AsyncStorage getAllKeys error:', error);
      return [];
    }
  },

  async multiGet(keys: string[]): Promise<[string, string | null][]> {
    try {
      return keys.map(key => [key, localStorage.getItem(key)]);
    } catch (error) {
      console.error('AsyncStorage multiGet error:', error);
      return keys.map(key => [key, null]);
    }
  },

  async multiSet(keyValuePairs: [string, string][]): Promise<void> {
    try {
      keyValuePairs.forEach(([key, value]) => {
        localStorage.setItem(key, value);
      });
    } catch (error) {
      console.error('AsyncStorage multiSet error:', error);
      throw error;
    }
  },

  async multiRemove(keys: string[]): Promise<void> {
    try {
      keys.forEach(key => {
        localStorage.removeItem(key);
      });
    } catch (error) {
      console.error('AsyncStorage multiRemove error:', error);
      throw error;
    }
  },
};

export { AsyncStorage };
