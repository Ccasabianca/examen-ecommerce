#!/usr/bin/env bash
# scénario de bout en bout et contrôles de sécurité, rejouable sur le code d'origine comme sur le corrigé
# usage : bash docs/scenario.sh [url_de_l_api] [url_du_gateway] [admin] [mot_de_passe_admin]
#   docker compose : bash docs/scenario.sh http://localhost:3000/api
#   code d'origine (npm run start:all) : bash docs/scenario.sh http://localhost:5000/api http://localhost:8000
# MAILPIT_URL=http://localhost:8025 pour lister les mails reçus en local
set -u
B=${1:-http://localhost:3000/api}
GW=${2:-}
ADMIN=${3:-admin}
ADMIN_PASSWORD=${4:-}
J='Content-Type: application/json'
U="client$(date +%s)"
code() { curl -s -m "${2:-15}" -o /tmp/scenario-body -w '%{http_code}' "${@:3}" "$1"; }
json() { node -e "let s='';process.stdin.on('data',d=>s+=d).on('end',()=>{try{const o=JSON.parse(s);console.log($1)}catch{console.log('')}})"; }
show() { echo "HTTP $1 $(head -c 300 /tmp/scenario-body)"; }

echo "### 1. santé de la chaîne"
show "$(code "$B/health/deep" 150)"
echo
echo "### 2. catalogue"
PRODUCTS=$(curl -s -m 30 "$B/products")
echo "$PRODUCTS" | json 'o.map((p) => `${p.name} ${p.price} € stock ${p.stock}`).join("\n")'
P1=$(echo "$PRODUCTS" | json 'o[0]._id')
PRIX=$(echo "$PRODUCTS" | json 'o[0].price')
echo
echo "### 3. inscription avec role=admin dans le corps"
BODY=$(printf '{"username":"%s","email":"%s@example.com","password":"motdepasse123","role":"admin"}' "$U" "$U")
show "$(code "$B/auth/register" 15 -X POST -H "$J" -d "$BODY")"
echo
echo "### 4. inscription avec des champs vides"
show "$(code "$B/auth/register" 15 -X POST -H "$J" -d '{"username":"","email":"","password":""}')"
echo
echo "### 5. connexion : compte inconnu puis mauvais mot de passe (messages différents = énumération)"
show "$(code "$B/auth/login" 15 -X POST -H "$J" -d '{"username":"personne_inconnue","password":"x"}')"
BODY=$(printf '{"username":"%s","password":"mauvais"}' "$U")
show "$(code "$B/auth/login" 15 -X POST -H "$J" -d "$BODY")"
echo
echo "### 6. injection NoSQL au login (username objet)"
show "$(code "$B/auth/login" 15 -X POST -H "$J" -d '{"username":{"$gt":""},"password":"x"}')"
echo
echo "### 7. connexion normale"
BODY=$(printf '{"username":"%s","password":"motdepasse123"}' "$U")
TOKEN=$(curl -s -m 15 -X POST "$B/auth/login" -H "$J" -d "$BODY" | json 'o.token')
echo "jeton reçu : ${#TOKEN} caractères"
AUTH="Authorization: Bearer $TOKEN"
echo
echo "### 8. commande avec un prix modifié par le client (vrai prix $PRIX, envoyé 0.01)"
BODY=$(printf '{"items":[{"productId":"%s","quantity":2,"price":0.01}],"shippingAddress":{"street":"12 rue des Lilas","city":"Lyon","postalCode":"69001","country":"France"},"paymentMethod":"Carte bancaire","shippingMethod":"colissimo"}' "$P1")
show "$(code "$B/orders" 150 -X POST -H "$J" -H "$AUTH" -d "$BODY")"
ORDER_ID=$(json 'o.order && o.order._id' < /tmp/scenario-body)
echo "stock du produit après la commande : $(curl -s -m 15 "$B/products" | json "o.find((p) => p._id === '$P1').stock")"
echo
echo "### 9. commande sans adresse ni paiement (formulaire vide)"
BODY=$(printf '{"items":[{"productId":"%s","quantity":1,"price":%s}]}' "$P1" "$PRIX")
show "$(code "$B/orders" 30 -X POST -H "$J" -H "$AUTH" -d "$BODY")"
echo
echo "### 10. client qui supprime une commande (route DELETE sans isAdmin ; délai 8 s)"
show "$(code "$B/orders/$ORDER_ID" 8 -X DELETE -H "$AUTH")"
echo
echo "### 11. client sur la liste des commandes (admin), sans jeton, jeton invalide"
show "$(code "$B/orders" 15 -H "$AUTH")"
show "$(code "$B/orders" 15)"
show "$(code "$B/orders" 15 -H 'Authorization: Bearer faux.jeton.invalide')"
echo
echo "### 12. XSS : nom d'utilisateur avec du html"
BODY=$(printf '{"username":"<img src=x onerror=alert(1)>%s","email":"x%s@example.com","password":"motdepasse123"}' "$U" "$U")
show "$(code "$B/auth/register" 15 -X POST -H "$J" -d "$BODY")"
echo
if [ -n "$ADMIN_PASSWORD" ]; then
  BODY=$(printf '{"username":"%s","password":"%s"}' "$ADMIN" "$ADMIN_PASSWORD")
  ADMIN_TOKEN=$(curl -s -m 15 -X POST "$B/auth/login" -H "$J" -d "$BODY" | json 'o.token')
  echo "### 13. admin : statut inconnu, puis identifiant mal formé"
  show "$(code "$B/orders/$ORDER_ID/status" 15 -X PUT -H "$J" -H "Authorization: Bearer $ADMIN_TOKEN" -d '{"status":"Volée"}')"
  show "$(code "$B/orders/abc/status" 15 -X PUT -H "$J" -H "Authorization: Bearer $ADMIN_TOKEN" -d '{"status":"Expédiée"}')"
  echo
fi
echo "### 14. route inconnue"
show "$(code "$B/inexistante" 15)"
echo
if [ -n "$GW" ]; then
  echo "### 15. appel direct du gateway sans clé : envoi de mail et stock"
  show "$(code "$GW/notify" 30 -X POST -H "$J" -d '{"to":"victime@example.com","subject":"spam","text":"spam"}')"
  show "$(code "$GW/update-stock" 30 -X POST -H "$J" -d '{"productId":"x","quantity":-999}')"
  echo
fi
if [ -n "${MAILPIT_URL:-}" ]; then
  sleep 2
  echo "### 16. mails reçus (mailpit)"
  curl -s "$MAILPIT_URL/api/v1/messages" |
    json 'o.messages.slice(0, 5).map((m) => m.To.map((t) => t.Address).join(",") + " | " + m.Subject).join("\n")'
fi
