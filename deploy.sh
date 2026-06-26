#!/bin/bash

# Deploy to PROD environment
ENV="PROD"
echo "🔥 Deploying to PROD environment..."
REMOTE_PATH="www/q-tokens.com.mx/public_html/luxottica"
BASE_HREF="/luxottica/"
API_URL="https://q-tokens.com.mx/luxottica/api"

SSH_KEY="/Users/friaz85/Documents/Proyectos/DesaLyL/luxottica/.ssh/id_ed25519"
REMOTE_USER="u13-duekhqdeblng@ssh.q-tokens.com.mx"
SSH_PARAMS="-p 18765 -o StrictHostKeyChecking=no -i \"$SSH_KEY\""

# 1. Update Frontend Environment
echo "📝 Updating frontend environment..."
cat > frontend/src/environments/environment.ts <<EOF
export const environment = {
    production: $( [ "$ENV" == "PROD" ] && echo "true" || echo "false" ),
    apiUrl: '$API_URL',
    uploadsUrl: '$API_URL/public/uploads',
    fallbackUrl: 'https://q-tokens.com.mx/luxottica/api/public/uploads'
};
EOF

# 2. Build Frontend
echo "🏗️ Building frontend..."
cd frontend
npx ng build --base-href $BASE_HREF
if [ $? -ne 0 ]; then echo "❌ Build failed"; exit 1; fi

# 3. Create .htaccess for the specific environment
echo "📄 Creating .htaccess..."
cat > dist/frontend/browser/.htaccess <<EOF
<IfModule mod_rewrite.c>
  RewriteEngine On
  RewriteBase $BASE_HREF
  RewriteRule ^index\.html$ - [L]
  RewriteCond %{REQUEST_FILENAME} !-f
  RewriteCond %{REQUEST_FILENAME} !-d
  RewriteRule . ${BASE_HREF}index.html [L]
</IfModule>

<IfModule mod_headers.c>
  # Disable caching for HTML files
  <FilesMatch "\.(html)$">
    Header set Cache-Control "no-cache, no-store, must-revalidate"
    Header set Pragma "no-cache"
    Header set Expires 0
  </FilesMatch>
</IfModule>
EOF

# 4. Deploy Frontend
echo "🚚 Uploading frontend to $REMOTE_PATH..."
rsync -avz -e "ssh -p 18765 -o StrictHostKeyChecking=no -i \"$SSH_KEY\"" dist/frontend/browser/ $REMOTE_USER:$REMOTE_PATH/
scp -P 18765 -o StrictHostKeyChecking=no -i "$SSH_KEY" "dist/frontend/browser/.htaccess" $REMOTE_USER:$REMOTE_PATH/

# 5. Deploy Backend (API)
echo "🚚 Uploading backend to $REMOTE_PATH/api..."
cd ..
# Ensure writable folder exists remotely
ssh -p 18765 -o StrictHostKeyChecking=no -i "$SSH_KEY" $REMOTE_USER "mkdir -p $REMOTE_PATH/api/writable/cache $REMOTE_PATH/api/writable/session $REMOTE_PATH/api/writable/logs && chmod -R 775 $REMOTE_PATH/api/writable"

rsync -avz -e "ssh -p 18765 -o StrictHostKeyChecking=no -i \"$SSH_KEY\"" --exclude 'writable' --exclude '.env' backend/ $REMOTE_USER:$REMOTE_PATH/api/

# Update backend .env if it doesn't exist or update it
echo "⚙️ Setting up backend .env..."
ssh -p 18765 -o StrictHostKeyChecking=no -i "$SSH_KEY" $REMOTE_USER "
    # Ensure .env exists (copy from .env.example if missing)
    if [ ! -f $REMOTE_PATH/api/.env ]; then
        cp $REMOTE_PATH/api/.env.example $REMOTE_PATH/api/.env 2>/dev/null || touch $REMOTE_PATH/api/.env
    fi
    # Ensure app.baseURL is present and correct
    if grep -q \"app.baseURL\" $REMOTE_PATH/api/.env; then
        sed -i \"s|app.baseURL =.*|app.baseURL = '$API_URL/'|g\" $REMOTE_PATH/api/.env
    else
        echo \"app.baseURL = '$API_URL/'\" >> $REMOTE_PATH/api/.env
    fi
    # Ensure PWD_CIPHER_KEY is set (used for AES-256 password encryption)
    if grep -q \"PWD_CIPHER_KEY\" $REMOTE_PATH/api/.env; then
        echo \"PWD_CIPHER_KEY already set\"
    else
        echo \"PWD_CIPHER_KEY = LuxotticaSecretKey2026!\" >> $REMOTE_PATH/api/.env
    fi
    # Ensure Taecel credentials are set
    if grep -q \"TAECEL_KEY\" $REMOTE_PATH/api/.env; then
        echo \"TAECEL_KEY already set\"
    else
        echo \"TAECEL_KEY = M1Ss74dU5Gx87KCW9mCz2Imi7bc8d6adbbdb9f57410848fa9ce325a54AeAd2k04dsciF6nmEvuo7qyu37xLuP\" >> $REMOTE_PATH/api/.env
        echo \"TAECEL_NIP = f82dc3d9102a7591fd37a5593dc5ab17T44ui7Pib2\" >> $REMOTE_PATH/api/.env
    fi

    # Add password_encrypted column if not exists
    mysql -h localhost -u ughgtdncr7ro5 -p'mrL*1*P7ke&f' db4ccgnbnclgjg -e \"ALTER TABLE users ADD COLUMN password_encrypted TEXT NULL AFTER password_hash;\" 2>/dev/null || true
    # Add vigencia_area column to rewards table if not exists
    mysql -h localhost -u ughgtdncr7ro5 -p'mrL*1*P7ke&f' db4ccgnbnclgjg -e \"ALTER TABLE rewards ADD COLUMN vigencia_area VARCHAR(500) NULL DEFAULT NULL;\" 2>/dev/null || true
    # Create CORS .htaccess for uploads folder (needed for PDF.js preview)
    mkdir -p $REMOTE_PATH/api/public/uploads/templates
    cat > $REMOTE_PATH/api/public/uploads/.htaccess << 'HTEOF'
Options -Indexes
<IfModule mod_headers.c>
    Header always set Access-Control-Allow-Origin \"*\"
    Header always set Access-Control-Allow-Methods \"GET, OPTIONS\"
    Header always set Access-Control-Allow-Headers \"Origin, Accept, Content-Type\"
</IfModule>
<IfModule mod_rewrite.c>
    RewriteEngine Off
</IfModule>
HTEOF
"


# 6. Create API .htaccess
echo "📄 Creating API .htaccess for redirection..."
ssh -p 18765 -o StrictHostKeyChecking=no -i "$SSH_KEY" $REMOTE_USER "cat > $REMOTE_PATH/api/.htaccess << 'HTEOF'
<IfModule mod_rewrite.c>
    RewriteEngine On
    RewriteCond %{HTTP:Authorization} .
    RewriteRule .* - [E=HTTP_AUTHORIZATION:%{HTTP_AUTHORIZATION}]
    RewriteRule ^uploads/(.*)$ public/uploads/\$1 [L]
    RewriteCond %{REQUEST_FILENAME} !-f
    RewriteCond %{REQUEST_FILENAME} !-d
    RewriteRule ^(.*)$ public/index.php/\$1 [L]
</IfModule>
HTEOF"
# Note: In the line above, we need \$1 because cat > file <<'EOF' preserves the backslash if it's escaped? 
# No, let's test.

# 7. Git Commit and Push
echo "💾 Committing and pushing changes to git..."
if [ -n "$(git status --porcelain)" ]; then
    git add .
    git commit -m "deploy: version $ENV deployed to SiteGround"
    CURRENT_BRANCH=$(git rev-parse --abbrev-ref HEAD)
    git push origin $CURRENT_BRANCH
else
    echo "ℹ️ No changes to commit in working directory."
fi

echo "✅ Deployment to $ENV finished successfully!"
