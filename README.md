# Feedback System

A Laravel + React web application for managing and collecting feedback.

## 📋 Requirements

Before setting up the project, install:

* PHP 8.3 or the PHP version required by the project
* Composer
* Node.js and npm
* MySQL / MariaDB
* Git
* XAMPP (recommended for Windows development)

Check your installed versions:

```bash
php -v
composer -V
node -v
npm -v
git --version
```

## 🚀 Team Setup

Follow these steps when setting up the project for the first time.

### 1. Clone the Repository

Clone the GitHub repository:

```bash
git clone https://github.com/cris-080/feedback-system.git
```

Enter the project folder:

```bash
cd feedback-system
```

### 2. Install PHP Dependencies

Run:

```bash
composer install
```

This installs the Laravel/PHP dependencies listed in `composer.lock`.

### 3. Install Frontend Dependencies

Run:

```bash
npm install
```

This installs the JavaScript dependencies listed in `package-lock.json`.

## ⚙️ Environment Configuration

### 4. Create Your .env File

The `.env` file is intentionally not stored in GitHub because it can contain local configuration and secrets.

**Windows CMD**

```cmd
copy .env.example .env
```

**PowerShell**

```powershell
Copy-Item .env.example .env
```

Then open `.env` and configure your local settings.

**Example:**

```env
APP_NAME=Laravel
APP_ENV=local
APP_DEBUG=true
APP_URL=http://localhost

DB_CONNECTION=mysql
DB_HOST=127.0.0.1
DB_PORT=3306
DB_DATABASE=fms_db_laravel
DB_USERNAME=root
DB_PASSWORD=
```

*Note: Use the database credentials configured on your own computer. Never commit your `.env` file to GitHub.*

### 5. Generate the Laravel Application Key

Run:

```bash
php artisan key:generate
```

This generates a local `APP_KEY`. Each developer should have their own `.env` and `APP_KEY`.

## 🗄️ Database Setup

### 6. Start MySQL

If using XAMPP:

1. Open XAMPP Control Panel.
2. Start MySQL.
3. Make sure MySQL is running on the port specified in your `.env`.

For the default configuration:

```env
DB_HOST=127.0.0.1
DB_PORT=3306
```

### 7. Create the Database

Create the database specified in `.env`.
For this project, the database name is: **`fms_db_laravel`**

You can create it using phpMyAdmin or MySQL.

**phpMyAdmin**

1. Open `http://localhost/phpmyadmin`
2. Select **New**
3. Enter: `fms_db_laravel`
4. Click **Create**

### 8. Run Database Migrations

Run:

```bash
php artisan migrate
```

This creates the database tables defined by the project's migrations.

If the project has seeders and you need the initial/sample data:

```bash
php artisan db:seed
```

Or do both at once:

```bash
php artisan migrate --seed
```

*Important: Do not run `php artisan migrate:fresh` unless you understand that it deletes the existing database tables and data.*

## 🔐 Default Test Credentials

Use the following credentials to access the different roles within the system:

| Role | Email | Password | 
| ----- | ----- | ----- | 
| **SuperAdmin** | `admin@clsu.edu.ph` | `password123` | 
| **Focal Person (MISO)** | `janes@gmail.com` | `lgvA7QIi87` | 
| **Feedback Committee** | `alexsinder@gmail.com` | `password123` | 

## 🌐 Starting the Application

You will need **two** separate terminal windows running simultaneously to power the full stack and real-time features.

### 9. Start the Full-Stack Application Server

Run:

```bash
npm run start
```

*Note: In this project, `npm run start` is configured to automatically launch both the React/Vite frontend development server AND the Laravel backend server (`php artisan serve`) together.*

Laravel will normally be available at: `http://127.0.0.1:8000`

### 10. Start the Real-Time WebSocket Server (Reverb)

Open a **second terminal** in the project directory and run:

```bash
php artisan reverb:start
```

This handles all real-time UI updates, notifications, and live dashboard metrics.

## 🧹 Useful Laravel Commands

* Clear Laravel caches: `php artisan optimize:clear`
* Check available routes: `php artisan route:list`
* Check migration status: `php artisan migrate:status`
* Create a new migration: `php artisan make:migration create_example_table`
* Create a controller: `php artisan make:controller ExampleController`

## 🔄 Git Workflow

**Before Starting Work**
Get the latest changes from GitHub:

```bash
git pull origin main
```

Then install dependencies if necessary:

```bash
composer install
npm install
```

**After Making Changes**
Check what changed:

```bash
git status
```

Stage your changes:

```bash
git add .
```

Create a commit:

```bash
git commit -m "Describe your changes"
```

Push to GitHub:

```bash
git push
```

### ⚠️ Important Git Rules

* **Do NOT commit `.env`**: Never run a command that intentionally adds `.env` to Git.
* **Do NOT commit dependencies**: The `/vendor/` and `/node_modules/` folders should remain excluded by `.gitignore`.

### 🔐 Secrets and API Keys

Never commit real API keys, passwords, database credentials, OAuth secrets, private tokens, or mail credentials. Put required environment variable names in `.env.example`, but leave sensitive values empty or use clearly non-secret placeholders.

### 🗃️ Database Rules for Team Development

The database structure should be shared through `database/migrations/`. Initial/sample data should be shared through `database/seeders/`. Avoid relying only on a developer's local database.

If you add or modify database structure, create a migration and commit it:

```bash
php artisan make:migration your_migration_name
```

## 🌿 Recommended Branch Workflow

For larger features, avoid making all changes directly on `main`. Create a feature branch:

```bash
git checkout -b feature/your-feature-name
```

Work on the feature, then:

```bash
git add .
git commit -m "Add feedback form"
git push -u origin feature/your-feature-name
```

Then create a Pull Request on GitHub for review.

## 📁 Important Project Structure

```text
feedback-system/
│
├── app/                         # Laravel application code
│
├── database/
│   ├── migrations/              # Database table structure
│   └── seeders/                 # Initial/sample data
│
├── public/                      # Publicly accessible files
├── resources/                   # React/frontend resources
├── routes/                      # Laravel routes
├── storage/                     # Laravel generated files
├── tests/                       # Automated tests
│
├── .env                         # Local configuration ⚠️ DO NOT COMMIT
├── .env.example                 # Environment configuration template
├── .gitignore                   # Files excluded from Git
│
├── composer.json                # PHP/Laravel dependencies
├── composer.lock                # Locked PHP dependency versions
├── package.json                 # JavaScript/React dependencies
├── package-lock.json            # Locked JavaScript dependency versions
│
└── README.md                    # Project documentation
```

## ✅ Quick Setup Checklist

For a new team member:

* [ ] Install PHP, Composer, Node.js/npm, Git, and MySQL/XAMPP.
* [ ] Clone the repository.
* [ ] Run `composer install`.
* [ ] Run `npm install`.
* [ ] Copy `.env.example` to `.env`.
* [ ] Configure database settings in `.env` (`DB_DATABASE=fms_db_laravel`).
* [ ] Run `php artisan key:generate`.
* [ ] Create the local database (`fms_db_laravel`).
* [ ] Run `php artisan migrate` (and `php artisan db:seed` if required).
* [ ] **Terminal 1:** Run `npm run start`.
* [ ] **Terminal 2:** Run `php artisan reverb:start`.
* [ ] Open the application locally and test with default credentials.

**👥 Team Rule:** Pull before you start working. Commit only your own changes. Push regularly. Never commit `.env` or secrets. If you change the database structure, commit the migration and update the team.

**Repository:** <https://github.com/cris-080/feedback-system>