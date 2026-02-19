# Database Seeding Scripts

This directory contains scripts to populate the database with sample data for development and testing.

## Available Scripts

### 1. `seed_quizzes.js`
Seeds the database with example quizzes that can be used for task verification.

**Quizzes included:**
- **Sustainability Basics Quiz** - 10 questions covering general sustainability concepts (70% passing score)
- **Advanced Sustainability Knowledge** - 5 advanced questions for experienced practitioners (80% passing score)
- **Energy Efficiency Quiz** - 5 questions about energy conservation (75% passing score)

**Run with:**
```bash
node scripts/seed_quizzes.js
```

### 2. `seed_tasks.js`
Seeds the database with example tasks across different categories.

**Important:** Run `seed_quizzes.js` first if you have quiz-based tasks, as this script will automatically link the "Sustainability Basics Quiz" to quiz verification tasks.

**Run with:**
```bash
node scripts/seed_tasks.js
```

### 3. `seed_badges.js`
Seeds the database with achievement badges.

**Run with:**
```bash
node scripts/seed_badges.js
```

### 4. `seed_neighborhoods.js`
Seeds the database with example neighborhoods.

**Run with:**
```bash
node scripts/seed_neighborhoods.js
```

### 5. `seed_task_templates.js`
Seeds the database with task templates for operators.

**Run with:**
```bash
node scripts/seed_task_templates.js
```

## Recommended Seeding Order

For a fresh database setup, run the scripts in this order:

```bash
# 1. Seed quizzes first (required for quiz-based tasks)
node scripts/seed_quizzes.js

# 2. Seed neighborhoods
node scripts/seed_neighborhoods.js

# 3. Seed badges
node scripts/seed_badges.js

# 4. Seed task templates
node scripts/seed_task_templates.js

# 5. Seed tasks (will link to quizzes automatically)
node scripts/seed_tasks.js
```

## How It Works

- Each script checks for existing records by title
- If a record exists, it will be **updated** with the latest data
- If a record doesn't exist, it will be **created**
- The `seed_tasks.js` script automatically finds and links quizzes by title

## Environment Variables

Make sure you have a `.env` file in the backend directory with:

```env
DB_URL=mongodb://localhost:27017/re-action
```

Or the script will use the default localhost connection.

## Example Output

```
Connected to MongoDB at mongodb://localhost:27017/re-action
✅ Created quiz: Sustainability Basics Quiz
✅ Created quiz: Advanced Sustainability Knowledge
✅ Created quiz: Energy Efficiency Quiz

✨ Quiz seeding complete. Created: 3, Updated: 0
```
