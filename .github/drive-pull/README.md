# Drive pull (encrypted)

The build sandbox cannot reach Google Drive; GitHub's runners can. To bring files from the owner's public Drive into a
session without anything readable passing through the public repository:

1. Make a key pair in the session (`openssl genpkey -algorithm RSA -pkeyopt rsa_keygen_bits:4096 -out priv.pem`,
   `openssl pkey -in priv.pem -pubout -out pub.pem`) and keep `priv.pem` in the session only.
2. Push a branch `drive-pull/<name>` with `.github/drive-pull/request.json`
   (`{"files":[{"id","dir","name"}], "folders":[{"id","dir"}]}`) and the session's `pub.pem`.
3. The workflow fetches, encrypts with a random AES key sealed to `pub.pem`, and pushes `drive-pull-out/<name>`.
4. Clone that branch, decrypt (`openssl pkeyutl -decrypt …`, `openssl enc -d -aes-256-cbc -pbkdf2 …`).
5. Ask the owner to delete both branches afterwards (GitHub → Branches → delete) — the session cannot delete branches.

Owner footage never enters the repository in the clear.
