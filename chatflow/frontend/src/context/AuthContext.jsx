
import React, {
  createContext,
  useContext,
  useEffect,
  useState,
} from 'react';

import authService from '../services/authService';
import userService from '../services/userService';
import socketManager from '../socket/socket';
import toast from 'react-hot-toast';


// ============================================================
// CONTEXT
// ============================================================

const AuthContext =
  createContext(null);


// ============================================================
// HOOK
// ============================================================

export const useAuth = () => {
  return useContext(
    AuthContext
  );
};


// ============================================================
// PROVIDER
// ============================================================

export const AuthProvider = ({
  children,
}) => {

  const [
    user,
    setUser,
  ] = useState(null);

  const [
    token,
    setToken,
  ] = useState(
    () =>
      localStorage.getItem(
        'token'
      )
  );

  const [
    refreshToken,
    setRefreshToken,
  ] = useState(
    () =>
      localStorage.getItem(
        'refreshToken'
      )
  );

  const [
    loading,
    setLoading,
  ] = useState(true);


  // ==========================================================
  // FETCH CURRENT USER
  // ==========================================================

  const fetchUser = async () => {

    try {

      const currentUser =
        await authService.getCurrentUser();

      if (!currentUser) {
        throw new Error(
          'User data was not returned'
        );
      }

      console.log(
        'Current user:',
        currentUser
      );

      setUser(
        currentUser
      );

      return currentUser;

    } catch (error) {

      console.error(
        'Error fetching current user:',
        error
      );

      /*
       * Clear the local session only.
       *
       * Do NOT call the backend logout endpoint here.
       */

      localStorage.removeItem(
        'token'
      );

      localStorage.removeItem(
        'refreshToken'
      );

      setToken(null);
      setRefreshToken(null);
      setUser(null);

      return null;

    } finally {

      setLoading(false);
    }
  };


  // ==========================================================
  // RESTORE SESSION
  // ==========================================================

  useEffect(() => {

    const savedToken =
      localStorage.getItem(
        'token'
      );

    if (!savedToken) {

      setLoading(false);

      return;
    }

    fetchUser();

  }, []);


  // ==========================================================
  // SOCKET
  // ==========================================================

  useEffect(() => {

    if (
      user &&
      token
    ) {

      socketManager.connect(
        token
      );

      const handleOnline =
        (data) => {

          console.log(
            'User online:',
            data
          );
        };

      const handleOffline =
        (data) => {

          console.log(
            'User offline:',
            data
          );
        };

      socketManager.on(
        'user:online',
        handleOnline
      );

      socketManager.on(
        'user:offline',
        handleOffline
      );

      return () => {

        socketManager.disconnect();

      };
    }

    socketManager.disconnect();

  }, [
    user,
    token,
  ]);


  // ==========================================================
  // LOGIN
  // ==========================================================

  const login = async (
    email,
    password
  ) => {

    try {

      const data =
        await authService.login(
          email,
          password
        );

      console.log(
        'Login data:',
        data
      );

      const {
        accessToken,
        refreshToken:
          newRefreshToken,
        user:
          loggedInUser,
      } = data;


      // ------------------------------------------------------
      // Validate response
      // ------------------------------------------------------

      if (
        !accessToken ||
        !newRefreshToken ||
        !loggedInUser
      ) {

        console.error(
          'Invalid login response:',
          data
        );

        throw new Error(
          'Invalid login response from server'
        );
      }


      // ------------------------------------------------------
      // Save tokens
      // ------------------------------------------------------

      localStorage.setItem(
        'token',
        accessToken
      );

      localStorage.setItem(
        'refreshToken',
        newRefreshToken
      );


      // ------------------------------------------------------
      // Update state
      // ------------------------------------------------------

      setToken(
        accessToken
      );

      setRefreshToken(
        newRefreshToken
      );

      setUser(
        loggedInUser
      );


      toast.success(
        'Logged in successfully'
      );


      return {
        success: true,
        user: loggedInUser,
      };

    } catch (error) {

      console.error(
        'Login error:',
        error
      );

      const message =
        error.response?.data?.message ||
        error.message ||
        'Login failed';

      toast.error(
        message
      );

      return {
        success: false,
        error: message,
      };
    }
  };


  // ==========================================================
  // REGISTER
  // ==========================================================

  const register = async (
    userData
  ) => {

    try {

      const data =
        await authService.register(
          userData
        );

      console.log(
        'Registration data:',
        data
      );

      const {
        accessToken,
        refreshToken:
          newRefreshToken,
        user:
          registeredUser,
      } = data;


      if (
        !accessToken ||
        !newRefreshToken ||
        !registeredUser
      ) {

        throw new Error(
          'Invalid registration response from server'
        );
      }


      // ------------------------------------------------------
      // Save tokens
      // ------------------------------------------------------

      localStorage.setItem(
        'token',
        accessToken
      );

      localStorage.setItem(
        'refreshToken',
        newRefreshToken
      );


      // ------------------------------------------------------
      // Update state
      // ------------------------------------------------------

      setToken(
        accessToken
      );

      setRefreshToken(
        newRefreshToken
      );

      setUser(
        registeredUser
      );


      toast.success(
        'Account created successfully'
      );


      return {
        success: true,
        user: registeredUser,
      };

    } catch (error) {

      console.error(
        'Registration error:',
        error
      );

      const message =
        error.response?.data?.message ||
        error.message ||
        'Registration failed';

      toast.error(
        message
      );

      return {
        success: false,
        error: message,
      };
    }
  };


  // ==========================================================
  // LOGOUT
  // ==========================================================

  const logout = async () => {

    const currentRefreshToken =
      localStorage.getItem(
        'refreshToken'
      );

    try {

      if (
        currentRefreshToken
      ) {

        await authService.logout(
          currentRefreshToken
        );
      }

    } catch (error) {

      console.error(
        'Logout error:',
        error
      );

    } finally {

      localStorage.removeItem(
        'token'
      );

      localStorage.removeItem(
        'refreshToken'
      );

      setToken(null);
      setRefreshToken(null);
      setUser(null);

      socketManager.disconnect();

      toast.success(
        'Logged out'
      );
    }
  };


  // ==========================================================
  // UPDATE PROFILE
  // ==========================================================

  const updateProfile = async (
    data
  ) => {

    try {

      const updatedUser =
        await userService.updateProfile(
          data
        );

      /*
       * userService returns response.data,
       * so the actual user is inside .data.
       */

      const userData =
        updatedUser?.data ||
        updatedUser;

      setUser(
        userData
      );

      toast.success(
        'Profile updated successfully'
      );

      return {
        success: true,
        user: userData,
      };

    } catch (error) {

      const message =
        error.response?.data?.message ||
        error.message ||
        'Update failed';

      toast.error(
        message
      );

      return {
        success: false,
        error: message,
      };
    }
  };


  // ==========================================================
  // CONTEXT VALUE
  // ==========================================================

  const value = {
    user,
    token,
    refreshToken,
    loading,

    login,
    register,
    logout,
    updateProfile,

    setUser,
  };


  return (
    <AuthContext.Provider
      value={value}
    >
      {children}
    </AuthContext.Provider>
  );
};
