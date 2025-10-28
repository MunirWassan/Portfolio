(function () {
  const form = document.getElementById('moneris-options');
  const launchButton = document.getElementById('launch-checkout');
  const statusEl = document.getElementById('moneris-status');
  const eventsEl = document.getElementById('moneris-events');
  const tokenButton = document.getElementById('load-tokenizer');
  const tokenizerContainer = document.getElementById('moneris-tokenizer');
  const tokenizerOutput = document.getElementById('tokenization-output');

  if (!form || !statusEl) {
    return;
  }

  let checkoutConfig = null;
  let checkoutInstance = null;
  let eventsBound = false;

  function setStatus(message) {
    if (!statusEl) return;
    statusEl.textContent = message;
  }

  function logEvent(name, payload) {
    if (!eventsEl) return;
    const entry = {
      event: name,
      timestamp: new Date().toISOString(),
      payload,
    };
    eventsEl.textContent = JSON.stringify(entry, null, 2) + '\n\n' + (eventsEl.textContent || '');
  }

  function resetCheckout() {
    checkoutConfig = null;
    if (launchButton) {
      launchButton.disabled = true;
    }
  }

  async function requestCheckout(data) {
    setStatus('Requesting checkout session…');
    resetCheckout();

    const response = await fetch('/api/moneris/checkout', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(data),
    });

    if (!response.ok) {
      const error = await response.json().catch(() => ({ message: response.statusText }));
      throw new Error(error.message || 'Failed to request checkout session.');
    }

    return response.json();
  }

  function resolveCheckoutInstance() {
    if (checkoutInstance) {
      return checkoutInstance;
    }

    const ctor = window.MonerisCheckout;
    if (typeof ctor === 'function') {
      try {
        checkoutInstance = new ctor();
        eventsBound = false;
        return checkoutInstance;
      } catch (error) {
        console.warn('Unable to instantiate MonerisCheckout', error);
      }
    }

    if (ctor && typeof ctor.configure === 'function') {
      checkoutInstance = ctor;
      return checkoutInstance;
    }

    return null;
  }

  function applyConfig(instance, config) {
    if (!instance || !config) return;

    if (typeof instance.setCheckoutId === 'function') {
      instance.setCheckoutId(config.checkoutId);
    }
    if (typeof instance.setEnvironment === 'function') {
      instance.setEnvironment(config.environment);
    }
    if (typeof instance.setMode === 'function') {
      instance.setMode(config.environment);
    }
    if (typeof instance.configure === 'function') {
      instance.configure(config);
    }

    const events = instance.Events || window.MonerisCheckout?.Events;
    if (!eventsBound && events && typeof instance.addEventListener === 'function') {
      eventsBound = true;
      if (events.PAYMENT_COMPLETE) {
        instance.addEventListener(events.PAYMENT_COMPLETE, (payload) => {
          logEvent('payment_complete', payload);
          setStatus('Payment complete. See event log for details.');
        });
      }
      if (events.CANCEL) {
        instance.addEventListener(events.CANCEL, (payload) => {
          logEvent('cancel', payload);
          setStatus('Checkout cancelled by shopper.');
        });
      }
      if (events.ERROR) {
        instance.addEventListener(events.ERROR, (payload) => {
          logEvent('error', payload);
          setStatus('Checkout reported an error.');
        });
      }
      return;
    }

    if (!eventsBound && typeof instance.setCallback === 'function') {
      eventsBound = true;
      instance.setCallback(function (eventName, payload) {
        logEvent(eventName, payload);
        if (eventName === 'payment_complete') {
          setStatus('Payment complete.');
        } else if (eventName === 'cancel') {
          setStatus('Checkout cancelled by shopper.');
        } else if (eventName === 'error') {
          setStatus('Checkout reported an error.');
        }
      });
    }
  }

  function startCheckout(instance, config) {
    if (!instance) {
      throw new Error('Moneris Checkout SDK is not available.');
    }

    if (typeof instance.startCheckout === 'function') {
      instance.startCheckout();
      return;
    }

    if (typeof instance.show === 'function') {
      instance.show();
      return;
    }

    if (typeof window.MonerisCheckout === 'function' && typeof window.MonerisCheckout.startCheckout === 'function') {
      window.MonerisCheckout.startCheckout(config.checkoutId);
      return;
    }

    if (typeof window.MonerisCheckout === 'function') {
      window.MonerisCheckout(config);
      return;
    }

    throw new Error('Unable to locate a launch method for the Moneris checkout SDK.');
  }

  form.addEventListener('submit', async (event) => {
    event.preventDefault();

    const formData = new FormData(form);
    const amount = Number(formData.get('amount'));
    const orderId = formData.get('orderId');
    const transactionType = formData.get('transactionType');

    if (!amount || amount <= 0) {
      setStatus('Enter a valid amount before requesting a checkout session.');
      return;
    }

    try {
      const payload = await requestCheckout({
        amount: amount.toFixed(2),
        orderId,
        transactionType,
      });

      checkoutConfig = {
        checkoutId: payload.checkoutId,
        environment: payload.environment || 'qa',
      };

      setStatus(`Checkout session ready. ID: ${checkoutConfig.checkoutId}`);
      if (launchButton) {
        launchButton.disabled = false;
      }
      logEvent('checkout_session', payload);
    } catch (error) {
      setStatus(error.message);
      resetCheckout();
    }
  });

  if (launchButton) {
    launchButton.addEventListener('click', () => {
      if (!checkoutConfig) {
        setStatus('Request a checkout session first.');
        return;
      }

      const instance = resolveCheckoutInstance();
      try {
        applyConfig(instance, checkoutConfig);
        startCheckout(instance, checkoutConfig);
        setStatus('Checkout launched.');
      } catch (error) {
        setStatus(error.message);
      }
    });
  }

  function writeTokenizerOutput(message) {
    if (!tokenizerOutput) return;
    const text = typeof message === 'string' ? message : JSON.stringify(message, null, 2);
    tokenizerOutput.textContent = text + '\n' + (tokenizerOutput.textContent || '');
  }

  if (tokenButton && tokenizerContainer) {
    tokenButton.addEventListener('click', () => {
      const profileId = tokenizerContainer.dataset.monerisTokenizationId;
      if (!profileId || profileId === 'REPLACE_WITH_PROFILE_ID') {
        writeTokenizerOutput('Update the data-moneris-tokenization-id attribute with your profile ID.');
        return;
      }

      const hostedLib = (window.Moneris && (window.Moneris.hostedTokenization || window.Moneris.HostedTokenization))
        || window.hostedTokenization
        || window.MonerisHostedTokenization;

      if (!hostedLib) {
        writeTokenizerOutput('Hosted tokenization library not loaded.');
        return;
      }

      try {
        const options = {
          containerId: tokenizerContainer.id,
          tokenizationId: profileId,
          onTokenize: (result) => {
            writeTokenizerOutput({ event: 'tokenize', result });
          },
          onError: (error) => {
            writeTokenizerOutput({ event: 'error', error });
          },
          onClose: () => {
            writeTokenizerOutput({ event: 'close' });
          },
        };

        if (typeof hostedLib.setup === 'function') {
          hostedLib.setup(options);
        }

        if (typeof hostedLib.start === 'function') {
          hostedLib.start();
        } else if (typeof hostedLib.show === 'function') {
          hostedLib.show();
        } else if (typeof hostedLib.open === 'function') {
          hostedLib.open();
        } else {
          writeTokenizerOutput('Unable to locate a start method for hosted tokenization.');
        }
      } catch (error) {
        writeTokenizerOutput(error.message);
      }
    });
  }
})();
