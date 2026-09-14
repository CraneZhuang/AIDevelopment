# AIDevelopment

A Next.js application whose first feature is a single-account login. This glossary fixes the words used for identity and access so that tickets, code, and tests name the same things.

## Language

**Account**:
A credential pair an operator signs in with. This project has exactly one, configured outside version control.
_Avoid_: User, Admin, Login

**Signed in**:
Holding a valid Session. The only access state this feature distinguishes.
_Avoid_: Authenticated, Logged in, Authorized

**Session**:
The server-issued proof that the current visitor is signed in. It carries the Account it was issued for and ends when it expires or the operator signs out.
_Avoid_: Login, Token, Cookie

**Protected page**:
A page reachable only while signed in. Visiting one while signed out sends the visitor to the sign-in form.
_Avoid_: Private page, Secured route, Dashboard

**Sign in** / **Sign out**:
Starting and ending a Session. Spelled as two words in prose; `login` and `logout` remain acceptable as URL segments and code identifiers, where a space is not available.
_Avoid_: Log in, Log out, Authenticate
