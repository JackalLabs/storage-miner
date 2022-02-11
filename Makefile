install:
	mkdir src/uploads || true
	mkdir logs || true
	cp .env.template .env || true
	npm install
	npm run start_genesis

start: 
	npm start