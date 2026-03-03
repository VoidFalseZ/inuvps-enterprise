# Git Branching Workflow (Beginner's Guide)

Welcome! If you are new to Git or just want a clear guide on how to manage your code in this project, you are in the right place.

We have set up three main branches for your project:
1. `main`
2. `development`
3. `production`

Here is a practical, step-by-step guide on what these branches do and how to use them.

---

## 1. The Three Branches

### `main`
- **What it is:** The default branch where all your stable, tested code lives.
- **When to use it:** You generally shouldn't write code directly here. Changes come here after they are tested in `development`.

### `development`
- **What it is:** The active "work in progress" branch. 
- **When to use it:** **You will spend most of your time here.** When you are building new features, fixing bugs, or testing things out, you do it on the `development` branch.

### `production`
- **What it is:** The exact code that is currently live and running on your actual server (for real users).
- **When to use it:** Only stable code that is ready to be released to the public goes here.

---

## 2. Your Daily Workflow (How to write code)

This is what a normal day of coding looks like:

### Step 1: Make sure you are on `development`
Before you start typing code, switch to your development branch.
```bash
git checkout development
```
*(Tip: You can use `git branch` to see which branch you are currently on. The one with a `*` next to it is your active branch.)*

### Step 2: Write your code!
Make your changes, create new files, test your app locally—do whatever you need to do.

### Step 3: Save (Commit) your changes
Once you are happy with a piece of work, save it to Git.
```bash
git add .
git commit -m "Describe what you did briefly, e.g., added login button"
```

### Step 4: Push to GitHub
Send your saved progress up to your GitHub repository so it doesn't get lost.
```bash
git push
```

---

## 3. Releasing Your Code (Going Live)

When you have finished a major feature or a bunch of updates in `development` and you want to release it to the real world, follow these steps:

### Step 1: Move your changes to `main`
First, bring everything from `development` into `main`. This signifies that the code is complete and stable.

```bash
git checkout main          # Switch to the main branch
git merge development      # Bring the development code into main
git push                   # Send the updated main branch to GitHub
```

### Step 2: Deploy to `production`
Now that `main` is stable, push it to `production` so your real server can use it.

```bash
git checkout production    # Switch to the production branch
git merge main             # Bring the stable code into production
git push                   # Send the updated production branch to GitHub
```

---

## 4. Cheat Sheet summary

- **Working on something new?** 
  `git checkout development` -> Write code -> `git add .` -> `git commit -m "message"` -> `git push`

- **Ready to show the world?**
  `git checkout main` -> `git merge development` -> `git push`
  `git checkout production` -> `git merge main` -> `git push`

---

## 5. What if I make a mistake?
If you realize you wrote code on the wrong branch (like `main`) but haven't committed yet, you can easily switch branches and your uncommitted code will come with you:
```bash
git checkout development
```
Then you can commit it safely there!
