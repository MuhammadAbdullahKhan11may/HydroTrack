/* =========================================================
   HydroTrack — Sign-Up Page Logic
   ========================================================= */

document.addEventListener('DOMContentLoaded', function () {

  const form = document.getElementById('signup-form');
  const nameInput = document.getElementById('name');
  const emailInput = document.getElementById('email');
  const passwordInput = document.getElementById('password');
  const termsInput = document.getElementById('terms');
  const submitBtn = document.getElementById('submit-btn');
  const togglePasswordBtn = document.getElementById('toggle-password');
  const iconEye = togglePasswordBtn.querySelector('.icon-eye');
  const iconEyeOff = togglePasswordBtn.querySelector('.icon-eye-off');
  const strengthBar = document.getElementById('strength-bar');
  const strengthText = document.getElementById('password-strength-text');
  const formSuccess = document.getElementById('form-success');

  const touched = {
    name: false,
    email: false,
    password: false,
    terms: false
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

  /* ---------------------------------------------------------
     Validators
     --------------------------------------------------------- */

  function validateName(rawValue) {
    const value = rawValue.trim();

    if (!value) {
      return 'Full name is required.';
    }

    if (value.length < 2) {
      return 'Name must be at least 2 characters.';
    }

    if (value.length > 50) {
      return 'Name cannot exceed 50 characters.';
    }

    if (!/^[A-Za-z\s'-]+$/.test(value)) {
      return 'Name can only contain letters, spaces, hyphens, and apostrophes.';
    }

    return '';
  }

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

    /*
      Duplicate-email validation is intentionally NOT performed here.

      Neon/PostgreSQL is now the source of truth.
      The backend checks whether the email already exists and returns
      HTTP 409 if necessary.
    */

    return '';
  }

  function validatePassword(value) {
    if (!value) {
      return 'Password is required.';
    }

    if (/\s/.test(value)) {
      return 'Password cannot contain spaces.';
    }

    if (value.length < 8) {
      return 'Password must be at least 8 characters.';
    }

    if (value.length > 64) {
      return 'Password cannot exceed 64 characters.';
    }

    if (!/[A-Z]/.test(value)) {
      return 'Add at least one uppercase letter.';
    }

    if (!/[a-z]/.test(value)) {
      return 'Add at least one lowercase letter.';
    }

    if (!/[0-9]/.test(value)) {
      return 'Add at least one number.';
    }

    if (!/[!@#$%^&*_\-+=?]/.test(value)) {
      return 'Add at least one special character.';
    }

    return '';
  }

  function validateTerms(checked) {
    if (!checked) {
      return 'You must agree to the Terms of Service and Privacy Policy.';
    }

    return '';
  }

  /* ---------------------------------------------------------
     Password strength
     --------------------------------------------------------- */

  function getPasswordStrength(value) {
    if (!value) {
      return {
        level: 'none',
        label: ''
      };
    }

    let score = 0;

    if (value.length >= 8) score++;
    if (value.length >= 12) score++;
    if (/[A-Z]/.test(value)) score++;
    if (/[a-z]/.test(value)) score++;
    if (/[0-9]/.test(value)) score++;
    if (/[!@#$%^&*_\-+=?]/.test(value)) score++;

    const meetsAllRequired =
      value.length >= 8 &&
      /[A-Z]/.test(value) &&
      /[a-z]/.test(value) &&
      /[0-9]/.test(value) &&
      /[!@#$%^&*_\-+=?]/.test(value) &&
      !/\s/.test(value);

    if (meetsAllRequired && score >= 5) {
      return {
        level: 'strong',
        label: 'Strong'
      };
    }

    if (score >= 3) {
      return {
        level: 'fair',
        label: 'Fair'
      };
    }

    return {
      level: 'weak',
      label: 'Weak'
    };
  }

  function updateStrengthMeter(value) {
    const strength = getPasswordStrength(value);

    strengthBar.className = 'strength-bar';
    strengthText.className = 'strength-text';

    if (strength.level === 'none') {
      strengthBar.style.width = '0%';
      strengthText.textContent = '';
      return;
    }

    strengthBar.classList.add('strength-' + strength.level);
    strengthText.classList.add('strength-' + strength.level);
    strengthText.textContent = strength.label;
  }

  /* ---------------------------------------------------------
     Field-level live validation
     --------------------------------------------------------- */

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

  nameInput.addEventListener('blur', function () {
    touched.name = true;

    runFieldValidation(
      nameInput,
      document.getElementById('name-error'),
      validateName
    );
  });

  nameInput.addEventListener('input', function () {
    if (touched.name) {
      runFieldValidation(
        nameInput,
        document.getElementById('name-error'),
        validateName
      );
    }
  });

  emailInput.addEventListener('blur', function () {
    touched.email = true;

    runFieldValidation(
      emailInput,
      document.getElementById('email-error'),
      validateEmail
    );
  });

  emailInput.addEventListener('input', function () {
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
    updateStrengthMeter(passwordInput.value);

    if (touched.password) {
      runFieldValidation(
        passwordInput,
        document.getElementById('password-error'),
        validatePassword
      );
    }
  });

  termsInput.addEventListener('change', function () {
    touched.terms = true;

    const errorEl = document.getElementById('terms-error');
    const error = validateTerms(termsInput.checked);

    if (error) {
      errorEl.textContent = error;
      errorEl.classList.remove('hidden');
    } else {
      errorEl.textContent = '';
      errorEl.classList.add('hidden');
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
     Handle backend field errors
     --------------------------------------------------------- */

  function showBackendFieldError(field, message) {
    if (field === 'name') {
      setFieldError(
        nameInput,
        document.getElementById('name-error'),
        message
      );

      nameInput.focus();
      return;
    }

    if (field === 'email') {
      setFieldError(
        emailInput,
        document.getElementById('email-error'),
        message
      );

      emailInput.focus();
      return;
    }

    if (field === 'password') {
      setFieldError(
        passwordInput,
        document.getElementById('password-error'),
        message
      );

      passwordInput.focus();
    }
  }

  /* ---------------------------------------------------------
     Submit handling
     --------------------------------------------------------- */

  async function handleSubmit(event) {
    event.preventDefault();

    if (isSubmitting) {
      return;
    }

    touched.name = true;
    touched.email = true;
    touched.password = true;
    touched.terms = true;

    const nameError = runFieldValidation(
      nameInput,
      document.getElementById('name-error'),
      validateName
    );

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

    const termsErrorEl = document.getElementById('terms-error');
    const termsError = validateTerms(termsInput.checked);

    if (termsError) {
      termsErrorEl.textContent = termsError;
      termsErrorEl.classList.remove('hidden');
    } else {
      termsErrorEl.textContent = '';
      termsErrorEl.classList.add('hidden');
    }

    const firstInvalid =
      (nameError && nameInput) ||
      (emailError && emailInput) ||
      (passwordError && passwordInput) ||
      (termsError && termsInput);

    if (firstInvalid) {
      firstInvalid.focus();
      return;
    }

    /* -------------------------------------------------------
       Submit to real HydroTrack backend
       ------------------------------------------------------- */

    isSubmitting = true;
    submitBtn.disabled = true;

    try {
      const response = await fetch('/api/auth/register', {
        method: 'POST',

        headers: {
          'Content-Type': 'application/json'
        },

        credentials: 'include',

        body: JSON.stringify({
          name: nameInput.value.trim(),
          email: emailInput.value.trim().toLowerCase(),
          password: passwordInput.value
        })
      });

      const data = await response.json();

      /* -----------------------------------------------------
         Backend rejected registration
         ----------------------------------------------------- */

      if (!response.ok) {

        // Backend supplied a specific field error
        if (data.field && data.message) {
          showBackendFieldError(
            data.field,
            data.message
          );

          return;
        }

        // General backend error
        alert(
          data.message ||
          'Unable to create account. Please try again.'
        );

        return;
      }

      /* -----------------------------------------------------
         Registration successful

         The backend has:
         - created the user in Neon
         - hashed the password with bcrypt
         - created default settings
         - generated a JWT
         - stored JWT in the HttpOnly hydroToken cookie
         ----------------------------------------------------- */

      form.classList.add('hidden');
      formSuccess.classList.remove('hidden');

      setTimeout(function () {
        window.location.href = 'dashboard.html';
      }, 900);

    } catch (error) {

      console.error('Registration request failed:', error);

      alert(
        'Unable to connect to HydroTrack. Please try again.'
      );

    } finally {

      isSubmitting = false;
      submitBtn.disabled = false;
    }
  }

  form.addEventListener('submit', handleSubmit);

});