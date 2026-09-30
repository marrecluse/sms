#!/bin/bash
cd /var/www/sms
exec php8.4 -S 127.0.0.1:8001 backend/router.php
