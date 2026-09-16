# Koristimo Node.js Alpine image jer je lakši.
FROM node:20-alpine

# Postavljamo radni folder unutar containera.
WORKDIR /app

# Kopiramo package fajlove pre ostatka projekta zbog Docker cache-a.
COPY package*.json ./

# Instaliramo dependencies.
RUN npm install

# Kopiramo ceo projekat u container.
COPY . .

# Otvaramo port aplikacije.
EXPOSE 3000

# Pokrećemo Next.js aplikaciju u development režimu.
CMD ["npm", "run", "dev", "--", "--hostname", "0.0.0.0"]