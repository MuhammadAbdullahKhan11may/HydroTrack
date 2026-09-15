/* =========================================================
   HydroTrack — Sign-In Page Logic
   ========================================================= */

document.addEventListener('DOMContentLoaded', function () {

  const form = document.getElementById('signin-form');
  const emailInput = document.getElementById('email');
  const passwordInput = document.getElementById('password');
  const rememberInput = document.getElementById('remember');
  const submitBtn = document.getElementById('submit-btn');
  const togglePasswordBtn = document.getElementById('toggle-password');
  const iconEye = togglePasswordBtn.querySelector('.icon-eye');
  const iconEyeOff = togglePasswordBtn.querySelector('.icon-eye-off');
  const forgotPasswordBtn = document.getElementById('forgot-password-btn');
  const forgotPasswordMsg = document.getElementById('forgot-password-msg');
  const authError = document.getElementById('auth-error');
  const authErrorText = document.getElementById('auth-error-text');
  const formSuccess = document.getElementById('form-success');

  const touched = {
    email: false,
    password: false
  };

  let isSubmitting = false;

  /* ---------------------------------------------------------
     Field error helpers
     --------------------------------------------------------- */

  function setFieldError(input, errorEl, message) {
    input.setAttribute('aria-invalid', 'true');
    input.classList.remove('field-valid');
    errorEl.textContent = message;
    errorEl.classList.remove('hidden');
  }

  function clearFieldError(input, errorEl, markValid) {
    input.setAttribute('aria-invalid', 'false');
    errorEl.textContent = '';
    errorEl.classList.add('hidden');

    if (markValid) {
      input.classList.add('field-valid');
    } else {
      input.classList.remove('field-valid');
    }
  }

  function showAuthError(message) {
    authErrorText.textContent = message;
    authError.classList.remove('hidden');
  }

  function clearAuthError() {
    authErrorText.textContent = '';
    authError.classList.add('hidden');
  }

  /* ---------------------------------------------------------
     Validators
     --------------------------------------------------------- */

  function validateEmail(rawValue) {
    const value = rawValue.trim();

    if (!value) {
      return 'Email address is required.';
    }

    if (/\s/.test(value)) {
      return 'Email address cannot contain spaces.';
    }

    const emailPattern = /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/;

    if (!emailPattern.test(value)) {
      return 'Enter a valid email address.';
    }

    return '';
  }

  function validatePassword(value) {
    if (!value) {
      return 'Password is required.';
    }

    return '';
  }

  function runFieldValidation(input, errorEl, validatorFn) {
    const error = validatorFn(input.value);

    if (error) {
      setFieldError(input, errorEl, error);
    } else {
      clearFieldError(
        input,
        errorEl,
        input.value.trim().length > 0
      );
    }

    return error;
  }

  /* ---------------------------------------------------------
     Field-level live validation
     --------------------------------------------------------- */

  emailInput.addEventListener('blur', function () {
    touched.email = true;

    runFieldValidation(
      emailInput,
      document.getElementById('email-error'),
      validateEmail
    );
  });

  emailInput.addEventListener('input', function () {
    clearAuthError();

    if (touched.email) {
      runFieldValidation(
        emailInput,
        document.getElementById('email-error'),
        validateEmail
      );
    }
  });

  passwordInput.addEventListener('blur', function () {
    touched.password = true;

    runFieldValidation(
      passwordInput,
      document.getElementById('password-error'),
      validatePassword
    );
  });

  passwordInput.addEventListener('input', function () {
    clearAuthError();

    if (touched.password) {
      runFieldValidation(
        passwordInput,
        document.getElementById('password-error'),
        validatePassword
      );
    }
  });

  /* ---------------------------------------------------------
     Show / hide password
     --------------------------------------------------------- */

  togglePasswordBtn.addEventListener('click', function () {
    const isHidden = passwordInput.type === 'password';

    passwordInput.type = isHidden ? 'text' : 'password';

    togglePasswordBtn.setAttribute(
      'aria-label',
      isHidden ? 'Hide password' : 'Show password'
    );

    iconEye.classList.toggle('hidden', isHidden);
    iconEyeOff.classList.toggle('hidden', !isHidden);
  });

  /* ---------------------------------------------------------
     Forgot password

     Password recovery is not implemented yet.
     --------------------------------------------------------- */

  forgotPasswordBtn.addEventListener('click', function () {
    forgotPasswordMsg.classList.remove('hidden');
  });

  /* ---------------------------------------------------------
     Check whether user is already authenticated

     The browser cannot read the HttpOnly hydroToken cookie.
     Instead, we ask the backend whether the cookie is valid.
     --------------------------------------------------------- */

  async function checkExistingAuthentication() {
    try {
      const response = await fetch('/api/auth/me', {
        method: 'GET',
        credentials: 'include'
      });

      if (response.ok) {
        window.location.href = 'dashboard.html';
      }
    } catch (error) {
      // If the backend cannot be reached, leave the user
      // on the sign-in page.
      console.error('Authentication check failed:', error);
    }
  }

  checkExistingAuthentication();

  /* ---------------------------------------------------------
     Submit handling
     --------------------------------------------------------- */

  async function handleSignIn(event) {
    event.preventDefault();

    if (isSubmitting) {
      return;
    }

    clearAuthError();

    touched.email = true;
    touched.password = true;

    const emailError = runFieldValidation(
      emailInput,
      document.getElementById('email-error'),
      validateEmail
    );

    const passwordError = runFieldValidation(
      passwordInput,
      document.getElementById('password-error'),
      validatePassword
    );

    if (emailError) {
      emailInput.focus();
      return;
    }

    if (passwordError) {
      passwordInput.focus();
      return;
    }

    isSubmitting = true;
    submitBtn.disabled = true;
    submitBtn.textContent = 'Signing in...';

    try {
      const response = await fetch('/api/auth/login', {
        method: 'POST',

        headers: {
          'Content-Type': 'application/json'
        },

        credentials: 'include',

        body: JSON.stringify({
          email: emailInput.value.trim().toLowerCase(),
          password: passwordInput.value
        })
      });

      const data = await response.json();

      /* -----------------------------------------------------
         Login rejected
         ----------------------------------------------------- */

      if (!response.ok) {

        // Invalid email format returned by backend
        if (data.field === 'email') {
          setFieldError(
            emailInput,
            document.getElementById('email-error'),
            data.message
          );

          emailInput.focus();
          return;
        }

        // Missing/invalid password field
        if (data.field === 'password') {
          setFieldError(
            passwordInput,
            document.getElementById('password-error'),
            data.message
          );

          passwordInput.focus();
          return;
        }

        // Wrong email OR wrong password.
        // Keep this generic for security.
        showAuthError(
          data.message || 'Incorrect email or password.'
        );

        return;
      }

      /* -----------------------------------------------------
         Login successful

         Backend has verified the bcrypt password and placed
         the JWT inside the HttpOnly hydroToken cookie.
         ----------------------------------------------------- */

      form.classList.add('hidden');
      formSuccess.classList.remove('hidden');

      setTimeout(function () {
        window.location.href = 'dashboard.html';
      }, 700);

    } catch (error) {
      console.error('Sign-in request failed:', error);

      showAuthError(
        'Unable to connect to HydroTrack. Please try again.'
      );

    } finally {
      isSubmitting = false;
      submitBtn.disabled = false;
      submitBtn.textContent = 'Sign In';
    }
  }

  form.addEventListener('submit', handleSignIn);

});