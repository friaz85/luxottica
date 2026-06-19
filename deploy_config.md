# Deployment Configuration: Embajadores TEC

## SSH Connection (SiteGround)
- **Hostname**: `ssh.q-tokens.com.mx`
- **Username**: `u13-duekhqdeblng`
- **Port**: `18765`
- **Path**: `/home/customer/www/q-tokens.com.mx/public_html/embajadores-tec`

## Database (SiteGround)
- **User**: `u25gmeog7cyva`
- **Password**: `$2%1k|1hc3k4`
- **Database**: `dbeisjvxfx8psg`

## Deployment Strategy
1.  **Frontend**: Upload contents of `frontend/dist/frontend/browser` (or `frontend/dist/frontend`) to the root of the target path.
2.  **Backend**: Upload contents of `backend/` to `/api` subdirectory within the target path.
3.  **Permissions**: Ensure `writable/` and `uploads/` folders have write permissions.
