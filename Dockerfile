# 1. Rasmiy Node.js image'dan foydalanamiz
FROM node:20-alpine

# 2. App uchun ishchi direktoriyani yaratamiz
WORKDIR /usr/src/app

# 3. package.json va package-lock.json fayllarini ko'chiramiz
COPY package*.json ./

# 4. Dependency'larni o'rnatamiz
RUN npm install -f
    
# 5. Barcha fayllarni ko'chiramiz
COPY . .

# 6. Portni ochamiz (masalan 5000 port)
EXPOSE 5000

# 7. Backend'ni ishga tushirish buyrug'i
CMD ["npm", "start"]
