# Authentication State Machines

## OAuth Login Flow

```
┌─────────────────────────────────────────────────────────────────────────────┐
│                           GitHub OAuth Flow                                  │
└─────────────────────────────────────────────────────────────────────────────┘

┌──────────────┐     Click "Continue      ┌───────────────┐
│              │      with GitHub"        │               │
│  LOGIN PAGE  │─────────────────────────▶│  REDIRECTING  │
│  (3D Laptop) │                          │   TO GITHUB   │
│              │                          │               │
└──────────────┘                          └───────┬───────┘
       ▲                                          │
       │                                          │ GET /auth/github
       │                                          │ (Backend constructs
       │                                          │  GitHub OAuth URL)
       │                                          ▼
       │                                  ┌───────────────┐
       │                                  │               │
       │                                  │    GITHUB     │
       │                                  │  LOGIN/AUTH   │
       │                                  │               │
       │                                  └───────┬───────┘
       │                                          │
       │                              ┌───────────┴───────────┐
       │                              │                       │
       │                         User Denies            User Approves
       │                              │                       │
       │                              ▼                       ▼
       │                      ┌─────────────┐        ┌─────────────────┐
       │                      │             │        │                 │
       │                      │   ERROR     │        │ GITHUB CALLBACK │
       │                      │   STATE     │        │ /auth/github/   │
       │                      │             │        │ callback?code=X │
       │                      └──────┬──────┘        └────────┬────────┘
       │                             │                        │
       │                             │                        ▼
       │                             │               ┌─────────────────┐
       │                             │               │                 │
       │    Redirect to              │               │ EXCHANGE CODE   │
       │    /login?error=X           │               │ FOR TOKEN       │
       │                             │               │ (Backend→GitHub)│
       │◀────────────────────────────┘               │                 │
       │                                             └────────┬────────┘
       │                                                      │
       │                                          ┌───────────┴───────────┐
       │                                          │                       │
       │                                     Token Error            Token Success
       │                                          │                       │
       │                                          ▼                       ▼
       │                                  ┌─────────────┐        ┌─────────────────┐
       │                                  │             │        │                 │
       │◀─────────────────────────────────│   ERROR     │        │  UPSERT USER    │
       │                                  │   STATE     │        │  IN DATABASE    │
       │                                  │             │        │                 │
       │                                  └─────────────┘        └────────┬────────┘
       │                                                                  │
       │                                                                  ▼
       │                                                         ┌─────────────────┐
       │                                                         │                 │
       │                                                         │ GENERATE JWT    │
       │                                                         │ (access+refresh)│
       │                                                         │                 │
       │                                                         └────────┬────────┘
       │                                                                  │
       │                                                                  ▼
       │                                                         ┌─────────────────┐
       │                                                         │                 │
       │                                                         │  SET COOKIES    │
       │                                                         │  & REDIRECT TO  │
       │                                                         │ /auth/callback  │
       │                                                         └────────┬────────┘
       │                                                                  │
       │                                                                  ▼
       │                                                         ┌─────────────────┐
       │                                                         │                 │
       │                                                         │ FRONTEND        │
       │                                                         │ /auth/callback  │
       │                                                         │ page.tsx        │
       │                                                         └────────┬────────┘
       │                                                                  │
       │                                          ┌───────────────────────┴─────┐
       │                                          │                             │
       │                                     Has Token                     Has Error
       │                                          │                             │
       │                                          ▼                             │
       │                                  ┌─────────────────┐                   │
       │                                  │                 │                   │
       │                                  │ STORE TOKEN     │                   │
       │                                  │ IN LOCALSTORAGE │                   │
       │                                  │                 │                   │
       │                                  └────────┬────────┘                   │
       │                                           │                            │
       │                                           ▼                            │
       │                                  ┌─────────────────┐                   │
       │                                  │                 │                   │
       │                                  │   FETCH USER    │                   │
       │                                  │   DATA (GET     │                   │
       │◀──────────────────────────────── │   /auth/me)     │◀──────────────────┘
       │                                  │                 │
       │  (on failure)                    └────────┬────────┘
       │                                           │
       │                                           ▼
       │                                  ┌─────────────────┐
       │                                  │                 │
       │                                  │   REDIRECT TO   │────────▶ FEED PAGE
       │                                  │   HOME (/)      │
       │                                  │                 │
       │                                  └─────────────────┘
```

## Login Page UI States

```
┌─────────────────────────────────────────────────────────────────────────────┐
│                        Login Page State Machine                              │
└─────────────────────────────────────────────────────────────────────────────┘

                              ┌─────────────┐
                              │             │
              ┌───────────────│   INITIAL   │
              │               │   LOADING   │
              │               │             │
              │               └──────┬──────┘
              │                      │
              │           useAuth() resolves
              │                      │
              │         ┌────────────┴────────────┐
              │         │                         │
              │    isAuthenticated            !isAuthenticated
              │         │                         │
              │         ▼                         ▼
              │  ┌─────────────┐          ┌─────────────────┐
              │  │             │          │                 │
              │  │  REDIRECT   │          │  3D SCENE       │
              │  │  TO HOME    │          │  MOUNTING       │
              │  │             │          │                 │
              │  └─────────────┘          └────────┬────────┘
              │                                    │
              │                           100ms delay
              │                                    │
              │                                    ▼
              │                           ┌─────────────────┐
              │                           │                 │
              │                           │  SCENE READY    │
              │                           │  (sceneReady    │
              │                           │  = true)        │
              │                           │                 │
              │                           └────────┬────────┘
              │                                    │
              │                                    ▼
              │                           ┌─────────────────┐
              │                           │                 │
              │                           │  3D LAPTOP      │
              │                           │  FADE IN        │
              │                           │  (opacity 0→1)  │
              │                           │                 │
              │                           └────────┬────────┘
              │                                    │
              │                            500ms delay
              │                                    │
              │                                    ▼
              │                           ┌─────────────────┐
              │                           │                 │
              │                           │  SCREEN         │
              │                           │  FLICKER ON     │
              │                           │  ANIMATION      │
              │                           │                 │
              │                           └────────┬────────┘
              │                                    │
              │                                    ▼
              │                           ┌─────────────────┐
              │                           │                 │
              │                           │  INTERACTIVE    │──────▶ User clicks
              │                           │  LOGIN FORM     │        "Continue with
              │                           │  ON SCREEN      │        GitHub"
              │                           │                 │
              │                           └────────┬────────┘
              │                                    │
              │                                    ▼
              │                           ┌─────────────────┐
              │                           │                 │
              └──────────────────────────▶│  REDIRECTING    │
                                          │  TO GITHUB      │
                                          │                 │
                                          └─────────────────┘
```

## 3D Laptop Component States

```
┌─────────────────────────────────────────────────────────────────────────────┐
│                        Laptop 3D Component States                            │
└─────────────────────────────────────────────────────────────────────────────┘

                              ┌─────────────┐
                              │             │
                              │  MOUNTED    │
                              │  (screen    │
                              │  off)       │
                              │             │
                              └──────┬──────┘
                                     │
                              500ms delay
                                     │
                                     ▼
                              ┌─────────────┐
                              │             │
                              │  SCREEN ON  │
                              │  (glow=0.3) │
                              │             │
                              └──────┬──────┘
                                     │
                              100ms delay
                                     │
                                     ▼
                              ┌─────────────┐
                              │             │
                              │  FLICKER 1  │
                              │  (glow=0)   │
                              │             │
                              └──────┬──────┘
                                     │
                               50ms delay
                                     │
                                     ▼
                              ┌─────────────┐
                              │             │
                              │  FLICKER 2  │
                              │  (glow=0.5) │
                              │             │
                              └──────┬──────┘
                                     │
                               80ms delay
                                     │
                                     ▼
                              ┌─────────────┐
                              │             │
                              │  FLICKER 3  │
                              │  (glow=0.2) │
                              │             │
                              └──────┬──────┘
                                     │
                               60ms delay
                                     │
                                     ▼
                              ┌─────────────┐
                              │             │
                              │  FULLY ON   │
                              │  (glow=1.0) │
                              │             │
                              └─────────────┘
                                     │
                                     │
                    ┌────────────────┼────────────────┐
                    │                │                │
                    ▼                ▼                ▼
            ┌─────────────┐  ┌─────────────┐  ┌─────────────┐
            │             │  │             │  │             │
            │  FLOATING   │  │   ORBIT     │  │   ZOOM      │
            │  ANIMATION  │  │  CONTROLS   │  │  CONTROLS   │
            │  (subtle    │  │  (drag to   │  │  (scroll)   │
            │  bob)       │  │  rotate)    │  │             │
            │             │  │             │  │             │
            └─────────────┘  └─────────────┘  └─────────────┘
```

## JWT Token Refresh Flow

```
┌─────────────────────────────────────────────────────────────────────────────┐
│                          Token Refresh State Machine                         │
└─────────────────────────────────────────────────────────────────────────────┘

                              ┌─────────────┐
                              │             │
                              │ API REQUEST │
                              │ WITH TOKEN  │
                              │             │
                              └──────┬──────┘
                                     │
                          ┌──────────┴──────────┐
                          │                     │
                    Token Valid            Token Expired
                          │                 (401 Error)
                          │                     │
                          ▼                     ▼
                   ┌─────────────┐       ┌─────────────┐
                   │             │       │             │
                   │  REQUEST    │       │  CALL       │
                   │  SUCCEEDS   │       │  /auth/     │
                   │             │       │  refresh    │
                   │             │       │             │
                   └─────────────┘       └──────┬──────┘
                                                │
                                    ┌───────────┴───────────┐
                                    │                       │
                              Refresh Valid           Refresh Invalid
                                    │                       │
                                    ▼                       ▼
                            ┌─────────────┐         ┌─────────────┐
                            │             │         │             │
                            │ NEW TOKENS  │         │  LOGOUT     │
                            │ SET IN      │         │  (clear     │
                            │ COOKIES     │         │  storage)   │
                            │             │         │             │
                            └──────┬──────┘         └──────┬──────┘
                                   │                       │
                                   ▼                       ▼
                            ┌─────────────┐         ┌─────────────┐
                            │             │         │             │
                            │ RETRY       │         │  REDIRECT   │
                            │ ORIGINAL    │         │  TO LOGIN   │
                            │ REQUEST     │         │             │
                            │             │         │             │
                            └─────────────┘         └─────────────┘
```

---

## Current OAuth Configuration Issue

**Problem:** "The redirect_uri is not associated with this application"

**Root Cause:** The GitHub OAuth App registered callback URL doesn't match the `GITHUB_CALLBACK_URL` environment variable.

**Current Configuration:**
```
GITHUB_CALLBACK_URL=http://localhost:4000/auth/github/callback
FRONTEND_URL=http://localhost:3000
```

**Required Fix:**
1. Go to GitHub Developer Settings → OAuth Apps → Your App
2. Ensure "Authorization callback URL" is set to: `http://localhost:4000/auth/github/callback`
3. If frontend is running on port 3001, update `FRONTEND_URL` in `.env`:
   ```
   FRONTEND_URL=http://localhost:3001
   ```

**URL Flow:**
```
User clicks login
    │
    ▼
Frontend: window.location.href = "http://localhost:4000/auth/github"
    │
    ▼
Backend: Redirect to GitHub with redirect_uri=http://localhost:4000/auth/github/callback
    │
    ▼
GitHub: User authenticates, redirects to http://localhost:4000/auth/github/callback?code=X
    │
    ▼
Backend: Exchange code, set cookies, redirect to http://localhost:3001/auth/callback?token=X
    │
    ▼
Frontend: Store token, fetch user, redirect to /
```
