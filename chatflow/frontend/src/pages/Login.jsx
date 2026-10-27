
import React, {
  useState,
} from 'react';

import {
  Link,
  useNavigate,
} from 'react-router-dom';

import {
  FaEnvelope,
  FaLock,
} from 'react-icons/fa';

import {
  useAuth,
} from '../context/AuthContext';


const Login = () => {

  const [
    email,
    setEmail,
  ] = useState('');

  const [
    password,
    setPassword,
  ] = useState('');

  const [
    loading,
    setLoading,
  ] = useState(false);

  const [
    error,
    setError,
  ] = useState('');

  const {
    login,
  } = useAuth();

  const navigate =
    useNavigate();


  // ==========================================================
  // LOGIN SUBMIT
  // ==========================================================

  const handleSubmit = async (
    e
  ) => {

    e.preventDefault();

    setError('');
    setLoading(true);

    try {

      const result =
        await login(
          email.trim(),
          password
        );


      console.log(
        'Login result:',
        result
      );


      if (
        result.success
      ) {

        /*
         * AuthContext has already:
         *
         * 1. Saved access token
         * 2. Saved refresh token
         * 3. Set user
         *
         * Now we can navigate to ChatFlow.
         */

        navigate(
          '/chat',
          {
            replace: true,
          }
        );

      } else {

        setError(
          result.error ||
          'Login failed'
        );
      }

    } catch (error) {

      console.error(
        'Login page error:',
        error
      );

      setError(
        error.message ||
        'Login failed'
      );

    } finally {

      setLoading(false);
    }
  };


  return (

    <form
      onSubmit={handleSubmit}
      className="space-y-4"
    >

      {/* ================================================== */}
      {/* ERROR */}
      {/* ================================================== */}

      {error && (

        <div
          className="
            bg-red-50
            border
            border-red-200
            text-red-600
            text-sm
            p-3
            rounded-lg
          "
        >
          {error}
        </div>
      )}


      {/* ================================================== */}
      {/* EMAIL */}
      {/* ================================================== */}

      <div>

        <label
          className="
            block
            text-sm
            font-medium
            text-gray-700
            mb-1
          "
        >
          Email Address
        </label>

        <div className="relative">

          <FaEnvelope
            className="
              absolute
              left-3
              top-1/2
              transform
              -translate-y-1/2
              text-gray-400
            "
          />

          <input
            type="email"
            value={email}
            onChange={(e) =>
              setEmail(
                e.target.value
              )
            }
            className="
              w-full
              pl-10
              pr-4
              py-2
              border
              border-gray-300
              rounded-lg
              focus:outline-none
              focus:ring-2
              focus:ring-primary-500
            "
            placeholder="Enter your email"
            autoComplete="email"
            required
          />

        </div>

      </div>


      {/* ================================================== */}
      {/* PASSWORD */}
      {/* ================================================== */}

      <div>

        <label
          className="
            block
            text-sm
            font-medium
            text-gray-700
            mb-1
          "
        >
          Password
        </label>

        <div className="relative">

          <FaLock
            className="
              absolute
              left-3
              top-1/2
              transform
              -translate-y-1/2
              text-gray-400
            "
          />

          <input
            type="password"
            value={password}
            onChange={(e) =>
              setPassword(
                e.target.value
              )
            }
            className="
              w-full
              pl-10
              pr-4
              py-2
              border
              border-gray-300
              rounded-lg
              focus:outline-none
              focus:ring-2
              focus:ring-primary-500
            "
            placeholder="Enter your password"
            autoComplete="current-password"
            required
          />

        </div>

      </div>


      {/* ================================================== */}
      {/* LOGIN BUTTON */}
      {/* ================================================== */}

      <button
        type="submit"
        disabled={loading}
        className="
          w-full
          py-2
          bg-primary-500
          text-white
          rounded-lg
          hover:bg-primary-600
          transition-colors
          disabled:opacity-50
          disabled:cursor-not-allowed
        "
      >

        {loading
          ? 'Logging in...'
          : 'Login'
        }

      </button>


      {/* ================================================== */}
      {/* REGISTER */}
      {/* ================================================== */}

      <p
        className="
          text-center
          text-sm
          text-gray-600
        "
      >

        Don't have an account?{' '}

        <Link
          to="/auth/register"
          className="
            text-primary-500
            hover:underline
          "
        >
          Register
        </Link>

      </p>

    </form>
  );
};


export default Login;
