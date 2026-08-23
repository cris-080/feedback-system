Feedback System

A Laravel + React web application for managing and collecting feedback.

📋 Requirements

Before setting up the project, install:

PHP 8.3 or the PHP version required by the project

Composer

Node.js and npm

MySQL / MariaDB

Git

XAMPP (recommended for Windows development)

Check your installed versions:

php -v
composer -V
node -v
npm -v
git --version

🚀 Team Setup

Follow these steps when setting up the project for the first time.

1. Clone the Repository

Clone the GitHub repository:

git clone https://github.com/cris-080/feedback-system.git

Enter the project folder:

cd feedback-system

2. Install PHP Dependencies

Run:

composer install

This installs the Laravel/PHP dependencies listed in composer.lock.

3. Install Frontend Dependencies

Run:

npm install

This installs the JavaScript dependencies listed in package-lock.json.

⚙️ Environment Configuration

4. Create Your .env File

The .env file is intentionally not stored in GitHub because it can contain local configuration and secrets.

Windows CMD

copy .env.example .env

PowerShell

Copy-Item .env.example .env

Then open .env and configure your local settings.

Example:

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

Use the database credentials configured on your own computer.

Never commit your .env file to GitHub.

5. Generate the Laravel Application Key

Run:

php artisan key:generate

This generates a local APP_KEY.

Each developer should have their own .env and APP_KEY.

🗄️ Database Setup

6. Start MySQL

If using XAMPP:

Open XAMPP Control Panel.

Start MySQL.

Make sure MySQL is running on the port specified in your .env.

For the default configuration:

DB_HOST=127.0.0.1
DB_PORT=3306

7. Create the Database

Create the database specified in .env.

For example:

fms_db_laravel

You can create it using phpMyAdmin or MySQL.

phpMyAdmin

Open http://localhost/phpmyadmin

Select New

Enter:

fms_db_laravel

Click Create

8. Run Database Migrations

Run:

php artisan migrate

This creates the database tables defined by the project's migrations.

If the project has seeders and you need the initial/sample data:

php artisan db:seed

Or:

php artisan migrate --seed

Important: Do not run php artisan migrate:fresh unless you understand that it deletes the existing database tables and data.

🎨 Frontend / React

9. Start the Frontend Development Server

Run:

npm run dev

Keep this terminal running while developing the React/Vite frontend.

🌐 Start Laravel

10. Start the Laravel Development Server

Open another terminal in the project directory:

php artisan serve

Laravel will normally be available at:

http://127.0.0.1:8000

If your project uses Vite, keep npm run dev running as well.

🧹 Useful Laravel Commands

Clear Laravel caches:

php artisan optimize:clear

Check available routes:

php artisan route:list

Check migration status:

php artisan migrate:status

Create a new migration:

php artisan make:migration create_example_table

Create a controller:

php artisan make:controller ExampleController

🔄 Git Workflow

Before Starting Work

Get the latest changes from GitHub:

git pull origin main

Then install dependencies if necessary:

composer install
npm install

After Making Changes

Check what changed:

git status

Stage your changes:

git add .

Create a commit:

git commit -m "Describe your changes"

Push to GitHub:

git push

Example:

git add .
git commit -m "Fix feedback form validation"
git push

⚠️ Important Git Rules

Do NOT commit .env

Never run a command that intentionally adds .env to Git.

Check whether .env is being tracked:

git ls-files .env

If there is no output, .env is not tracked.

The repository should contain:

.env.example

but not:

.env

Do NOT commit dependencies

The following should normally remain excluded by .gitignore:

/vendor/
/node_modules/

Other generated or local-only files should also follow the project's .gitignore.

🔐 Secrets and API Keys

Never commit real:

API keys

passwords

database credentials

OAuth secrets

private tokens

mail credentials

payment credentials

Put required environment variable names in .env.example, but leave sensitive values empty or use clearly non-secret placeholders.

Example:

GEMINI_API_KEY=

Each developer should configure their own secret locally.

🗃️ Database Rules for Team Development

The database structure should be shared through:

database/migrations/

Initial/sample data should be shared through:

database/seeders/

Avoid relying only on a developer's local database.

If you add or modify database structure, create a migration and commit it:

php artisan make:migration your_migration_name

Then run:

php artisan migrate

🌿 Recommended Branch Workflow

For larger features, avoid making all changes directly on main.

Create a feature branch:

git checkout -b feature/your-feature-name

Example:

git checkout -b feature/feedback-form

Work on the feature, then:

git add .
git commit -m "Add feedback form"
git push -u origin feature/feedback-form

Then create a Pull Request on GitHub for review.

📝 Commit Message Examples

Use clear commit messages.

Good:

Add feedback form validation
Fix admin dashboard statistics
Update department management
Add sentiment analysis API
Fix QR code generation
Update database migration

Avoid vague messages such as:

update
fix
changes
asdf
final
final2

🆘 Troubleshooting

php is not recognized

PHP is not available in your system PATH.

If using XAMPP, verify that PHP is installed and configured correctly.

composer is not recognized

Install Composer and make sure it is available in your PATH.

Check:

composer -V

npm is not recognized

Install Node.js and verify:

node -v
npm -v

Database connection error

Check:

MySQL/MariaDB is running.

DB_HOST is correct.

DB_PORT is correct.

DB_DATABASE exists.

DB_USERNAME is correct.

DB_PASSWORD is correct.

Then clear Laravel's cached configuration:

php artisan optimize:clear

Missing application key

Run:

php artisan key:generate

Migration problems

Check:

php artisan migrate:status

Do not immediately use:

php artisan migrate:fresh

because it deletes existing database tables and data.

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

✅ Quick Setup Checklist

For a new team member:

Install PHP

Install Composer

Install Node.js/npm

Install Git

Install/start MySQL or XAMPP

Clone the repository

Run composer install

Run npm install

Copy .env.example to .env

Configure database settings in .env

Run php artisan key:generate

Create the local database

Run php artisan migrate

Run php artisan db:seed if required

Run npm run dev

Run php artisan serve

Open the application locally

👥 Team Rule

Pull before you start working. Commit only your own changes. Push regularly. Never commit .env or secrets.

If you change the database structure, commit the migration and update the team.

Repository:

https://github.com/cris-080/feedback-system