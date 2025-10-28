Telephasic by HTML5 UP
html5up.net | @ajlkn
Free for personal and commercial use under the CCA 3.0 license (html5up.net/license)


This is Telephasic, a brand new site template for HTML5 UP. It features a sharp, modern
design inspired by omfg everything, and makes good use of SVGs to ensure stuff looks
nice and crispy on retina displays.

Demo images* are courtesy of Felicia Simion, an amazing photographer with an
incredible portfolio over at deviantART:

http://ineedchemicalx.deviantart.com/

(* = Not included! Only meant for use with my own on-site demo, so please do NOT download
and/or use any of Felicia's work without her explicit permission!)

Feedback, bug reports, and comments are not only welcome, but strongly encouraged :)

AJ
aj@lkn.io | @ajlkn

PS: Not sure how to get that contact form working? Give formspree.io a try (it's awesome).


Credits:

	Demo Images:
		Felicia Simion (ineedchemicalx.deviantart.com)

	Icons:
		Font Awesome (fontawesome.io)

	Other:
                jQuery (jquery.com)
                Responsive Tools (github.com/ajlkn/responsive-tools)

Moneris Checkout & Hosted Tokenization Demo
==========================================

This repo now ships with a working example of the Moneris hosted checkout and hosted
tokenization flows. Follow the steps below to try a QA purchase using your Moneris test
credentials.

1. Install dependencies: `npm install`
2. Export your credentials (replace the placeholders with your QA keys):

        export MONERIS_STORE_ID=store5
        export MONERIS_API_TOKEN=yourapitoken
        # Optional overrides
        export MONERIS_ENV=qa
        export MONERIS_DESCRIPTOR="Demo Shop"

3. Start the helper API: `npm run moneris:server`
4. Browse to `http://localhost:5174/moneris-checkout.html`. Use the form to request a
   checkout session and then click **Launch Moneris Checkout** to complete a test
   transaction.
5. Use the **Load hosted tokenization** button to embed Moneris' iframe after you set
   the `data-moneris-tokenization-id` attribute on the page with your profile ID.

Refer to the Moneris documentation for optional fields (billing address, recurring
payments, etc.) and extend `server/moneris-checkout-server.js` to include them before
requesting a checkout session.