# Secret Santa

A small website for running Secret Santa exchanges. It's free to host on GitHub Pages, and Firebase stores the data.

- **index.html** is the guest page. Each guest opens their own personal link. They see one event, edit only their own wish list, and after the draw see only their own match.
- **admin.html** is the organizer page. You sign in with email and password (or Google) to create events, add guests, set can't-draw pairs, run the draw, and copy each guest's invite.

## How privacy works

- Each guest has a secret personal key, which sits inside their link. The Firestore rules let a browser write a wish list only after it proves it holds that guest's key.
- Each match is encrypted with the guest's key, so the database only holds sealed boxes. The organizer page never shows who has whom.
- Guests can't list events, so one event's guests can't find the others.
- If a link leaks, use **New link** on the organizer page. The old link stops working, and the wish list and match carry over.

## Setup

1. **Firebase project**: console.firebase.google.com › Create a project.
   - Build › Firestore Database › Create database (production mode).
   - Build › Authentication › Sign-in method: enable **Anonymous** and **Email/Password** (Google is optional).
   - Authentication › Users › Add user: create your organizer account and copy its **User UID**.
   - Authentication › Settings › Authorized domains: add `<your-github-username>.github.io`.
   - Project settings › Your apps › Web app: copy the config into `firebase-config.js`.
2. **Security rules**: copy `firestore.rules` into Firestore › Rules. Replace `ORGANIZER_UID` with that User UID (and `ORGANIZER_EMAIL` with your Google address if you use Google sign-in), then click Publish. These stay in the Firebase console and never go in this repo.
3. **GitHub Pages**: repo Settings › Pages › Deploy from a branch › `main` / root.
4. Open `https://<your-github-username>.github.io/<repo>/admin.html` and sign in.
