FROM php:8.3-apache

WORKDIR /var/www/html
COPY . /var/www/html/

RUN a2enmod rewrite \
    && printf '<Directory /var/www/html>\nAllowOverride All\nRequire all granted\n</Directory>\n' > /etc/apache2/conf-available/allow-override.conf \
    && a2enconf allow-override

EXPOSE 80
CMD ["apache2-foreground"]
