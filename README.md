# Fullstack Interview Task

Hey! Welcome to the interview task. Below is a Node.js + Express + Sequelize and React for a simple social media app. Read through everything before you start.

---

## Getting Started

**Prerequisites:** Node.js 20.19+ (or 22.12+), MySQL 8, Yarn

**1. Database**

Create the database and a dedicated user, then load the schema and seed data:

```bash
mysql -u root -p -e "CREATE DATABASE social_media_db; CREATE USER 'social_app'@'localhost' IDENTIFIED BY '<password>'; GRANT ALL PRIVILEGES ON social_media_db.* TO 'social_app'@'localhost';"
mysql -u social_app -p social_media_db -e "source schema.sql; source insert_data.sql;"
```

**2. Environment**

Copy `.env.example` to `.env` and fill in the DB credentials and a long random `JWT_SECRET`. The server won't start if `DB_NAME`, `DB_USER` or `JWT_SECRET` is missing.

**3. Install and run**

```bash
yarn install
yarn dev:api    # API on http://localhost:3000 (restarts on file changes)
yarn dev:web    # Frontend on http://localhost:5173
```

Open `http://localhost:5173`. In development Vite proxies `/api` to the backend, so no CORS setup is needed. For a deployment where the API lives on another origin, set `VITE_API_BASE_URL`.

**Notes**

- The seeded users can't log in: their `password_hash` values are SHA-256 hashes, not bcrypt. Sign up with a new account instead.
- Trending shows posts from the last 7 days, so it's empty with the seed data (all from Jan–Feb 2026) until new posts are created.

---

## Project Structure

```
server/
  index.js              # connect to the DB and start listening
  app.js                # Express app: routes, 404, error handler
  config.js             # reads and validates environment variables
  models.js             # Sequelize models and associations
  middleware/           # auth (JWT), error handler
  routes/               # auth, users, posts (+ likes), comments, discovery (trending + search)
  utils/                # input validation, shared query helpers
src/
  App.jsx               # layout, tabs, auth gate
  api.js                # axios client: base URL, auth header, 401 handling
  AuthContext.jsx       # login / register / logout state
  components/           # Feed, Post, CreatePost, TrendingPosts, Search, UserProfile, AuthForm, Avatar
  styles.css
main.jsx                # frontend entry point
```

---

## App Preview

This is what the working app looks like:

![App Preview](app_image.png)

---

## API Endpoints Reference

**Auth**
```
POST   /api/auth/login         - Log in, returns { token, user }
POST   /api/users              - Register, returns { token, user }
```

Authenticated routes expect an `Authorization: Bearer <token>` header.

**Users**
```
GET    /api/users              - Get all users (public fields only)
GET    /api/users/:id          - Get user profile with stats
```

**Posts**
```
GET    /api/posts              - Get feed (?limit=20&cursor=...), returns { posts, next_cursor }
GET    /api/posts/:id          - Get post with comments
POST   /api/posts              - Create post (auth required)
PUT    /api/posts/:id          - Update post (auth required)
DELETE /api/posts/:id          - Delete post (auth required)
```

**Comments**
```
GET    /api/posts/:postId/comments   - Get comments for post
POST   /api/posts/:postId/comments   - Create comment (auth required)
DELETE /api/comments/:id             - Delete comment (auth required)
```

**Likes**
```
POST   /api/posts/:postId/like       - Like a post (auth required)
DELETE /api/posts/:postId/unlike     - Unlike a post (auth required)
```

**Trending & Search**
```
GET    /api/trending           - Get trending posts (last 7 days)
GET    /api/search?q=keyword   - Search posts
```

---

## Tasks

**Part 1 — Models & Associations**

The Sequelize model fields and associations are missing from `backend_express.js`. Look at `schema.sql` and fill them in. The model variables are already declared — you just need to define the fields and wire up the relationships. Nothing will work until this is done.

---

**Part 2 — Bug Fixes**

Once the models are in, there are more issues to find and fix:

1. The authentication isn't actually doing anything.

2. Because of #1, several routes will crash at runtime — figure out which ones and why and provide the fix.

3. There's a register endpoint but no way to log in. Users can't get a token.

4. Some of the Sequelize includes use the wrong association type, find out and fix them.

5. The API response shape doesn't match what the frontend expects for posts and comments — some fields won't show up on screen.

6. Improve how credentials are handled in the app.

7. Two route handlers are importing a module inline, improve them.

8. One model relationship is missing from the associations block even though the foreign key exists on the model.

9. The frontend has some missing functionality and UX gaps — have a look around, identify what's lacking, and improve it.

10. The feed endpoint works but isn't production-ready — think about what happens when there are thousands of posts. Improve it.

---

**Part 3 — Code Quality & Production Readiness**

Go through both the backend and frontend with a critical eye. There are no specific bugs here — it's more about whether the code is ready for the real world:

11. The API has some design and security gaps — think about what a public-facing API should guard against, what it should expose, and whether it follows consistent conventions throughout.

12. The backend has a few inefficiencies and dead code — look at how data is fetched and whether anything can be cleaned up or done better.

13. The frontend has no real error handling, missing states, and some unsafe assumptions about data — make it behave correctly under most of the conditions, not just the happy path.

14. Think about how the app would be configured and run across different environments, and whether any hardcoded values or decisions made here would cause problems in production.

15. The entire backend lives in a single file and the frontend follows a similar pattern — think about how you'd structure this for a real project.

---

## What We're Looking For

- Models and associations are correct and complete
- All bugs in Part 2 identified and fixed
- Part 3: Short write-up on what you found and fixes if you can, what you changed, and why
- Code is clean — no dead code, no leftover TODOs or commented-out blocks
- App works end to end — auth, posts, comments, and user data all render correctly

---

## How to submit for review
- Push all your changes on your branch starting with you name. Create that branch if not exist.
- Raise a PR from your branch to main branch.

