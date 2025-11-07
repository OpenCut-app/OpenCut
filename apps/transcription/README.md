Before you follow anything in this guide, please make sure you've followed the steps in the [README](../../README.md) (under "Optional: Auto-captions (Transcription) Setup").

Open your terminal and make sure you're in the `apps/transcription` directory.

1. Create virtual environment

```bash
python -m venv env
```

2. Activate it

**Windows:**

```bash
env\Scripts\activate
```

**macOS/Linux:**

```bash
source env/bin/activate
```

> Note: if you're using VS Code/Cursor and you're seeing errors with the imports about the modules not being found,
> You might have to press CTRL + Shift + P -> Python: Select Interpreter -> Enter interpreter path -> Find -> env -> scripts -> python.exe

3. Install libraries/packages/whatever you wanna call them

```bash
pip install -r requirements.txt
```

4. Make sure you have a Modal account. If you don't: [create one](https://modal.com/)

> If you don't know what Modal is: it allows us to process the actual audio and transcribe with Whisper by providing the infra to run Python code with a lot of RAM, generally affordable.

5. Once you've got a Modal accoumt, run this:

```bash
python -m modal setup
```

It's gonna open a browser so you can authenticate.

6. Test it if you want to make sure it actually works:

```bash
modal run transcription.py
```

6. Deploy the function!

```bash
modal deploy transcription.py
```

7. Set the required secrets in Modal

So the script we just deployed interacts with Cloudflare to do two things:

- Download the audio (so it can be transcribed with Whisper)
- Delete the file after processing (privacy)

To do those things, the script needs access to these environment variables:
```bash
CLOUDFLARE_ACCOUNT_ID=your-account-id
R2_ACCESS_KEY_ID=your-access-key-id
R2_SECRET_ACCESS_KEY=your-secret-access-key
R2_BUCKET_NAME=opencut-transcription
```

Remember, we set these earlier in `.env.local`.

So let's do it:

   - Go to [Modal Secrets](https://modal.com/secrets/mazewinther/main)
   - Click "Custom" and enter "opencut-r2-secrets" for the name.
   - Now you can just click "Import .env" and copy/paste the 4 variables from your `.env.local` file. Copy and paste these only:
      ```bash
      CLOUDFLARE_ACCOUNT_ID=your-account-id
      R2_ACCESS_KEY_ID=your-access-key-id
      R2_SECRET_ACCESS_KEY=your-secret-access-key
      R2_BUCKET_NAME=opencut-transcription
      ```
    - Click "Done" and you should see some cool particles!