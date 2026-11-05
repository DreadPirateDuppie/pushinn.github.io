Rebuild assets/tailwind.css after changing classes or colours (Tailwind 3.4.17):

    cd tools/tailwind && npx tailwindcss@3.4.17 -c tailwind.config.js -i in.css -o ../../assets/tailwind.css --minify

Legal pages (legal-privacy.html, legal-terms.html) still use the CDN script while the legal freeze is on.
