# Deployment Configuration: Luxottica
 
 ## SSH Connection (SiteGround)
 - **Hostname**: `ssh.q-tokens.com.mx`
 - **Username**: `u13-duekhqdeblng`
 - **Port**: `18765`
 - **Path**: `/home/customer/www/q-tokens.com.mx/public_html/luxottica`
 
 ## Database (SiteGround)
 - **User**: `ughgtdncr7ro5`
 - **Password**: `mrL*1*P7ke&f`
 - **Database**: `db4ccgnbnclgjg`
 
 ## Deployment Strategy
 1.  **Frontend**: Upload contents of `frontend/dist/frontend/browser` (or `frontend/dist/frontend`) to the root of the target path.
 2.  **Backend**: Upload contents of `backend/` to `/api` subdirectory within the target path.
 3.  **Permissions**: Ensure `writable/` and `uploads/` folders have write permissions.
