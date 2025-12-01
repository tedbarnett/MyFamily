# "My Family" - Memory Aid App

A mobile-friendly web application designed to help seniors identify and remember family members, friends, and caregivers through photos and simple navigation.

![Home Page](attached_assets/homepage_screenshot.png)

## About This App

This app was created for seniors who want an easy way to look up and remember the people in their lives. The design prioritizes:

- **Extra-large text** that's easy to read
- **Big touch buttons** that are easy to tap
- **High contrast colors** for visibility
- **Simple navigation** with one action per screen
- **Photos with names** for easy recognition
- **No login required** for the senior user

## Multi-Family Support

The app supports multiple families, each with their own unique URL:
- Each family has a custom URL (e.g., `/smith-family`)
- Family members authenticate using a simple join code
- Seniors access the app without any login

## How to Use the App

### Home Screen

When you open the app, you'll see category buttons with photos and special feature buttons:

- **Category Buttons**: Dark buttons showing a preview photo of someone in that group, with a count of how many people are in each category - tap to see everyone
- **Everyone**: View all family members in one scrollable list
- **Birthdays**: Shows upcoming birthdays with photos, names, and countdown to their special day
- **Memory Quiz**: A fun 5-question game to practice remembering family members
- **Photo Album**: Swipe through photos of everyone (starts with grandchildren for maximum engagement)
- **Search**: Type any name, relationship, or location to find someone
- **Welcome Message**: A personalized message from the family appears at the bottom of the screen

### Viewing a Category

After tapping a category, you'll see photo cards for each person. Each card shows:
- Their photo (or initials if no photo)
- Their name
- Their relationship to you

Tap any card to see more details about that person.

### Person Details

The detail page shows everything about a person:
- Large photo with their name and role
- Full name (if different from display name)
- Where they live
- Their birthday and age
- Their spouse/partner (tap the name to see their page)
- Their children (tap any name to see their page)
- A summary about them
- Voice note (if recorded)

Tap the blue **Back** button to return.

### Photo Album

The Photo Album lets you browse through everyone like flipping through a photo book:
- Swipe left or right to move between people
- See their photo, name, and relationship
- Tap to view their full details

### Birthdays

The Birthdays page shows upcoming birthdays in your family and friends. Each birthday card displays:
- The person's photo
- Their name and relationship
- How many days until their birthday

### Memory Quiz

The Memory Quiz is a fun way to practice remembering everyone:
- You'll see 5 random photos one at a time
- Tap the name you think matches the photo
- Get instant feedback on whether you're right
- See your final score at the end
- Quiz results are tracked over time on the admin page

## Categories

The app organizes people into these default groups:

| Category | Description |
|----------|-------------|
| Husband | Your spouse |
| Wife | Your spouse |
| Children | Sons and daughters |
| Grandchildren | All grandchildren |
| Partners | Spouses and partners of your children |
| Friends & Neighbors | Close friends and neighbors |
| Caregivers | People who help with care |

**Note**: Categories can be renamed or hidden in Admin settings to match your family's needs.

## Admin Features

The admin page lets family members edit information and upload photos. To access it:

1. Navigate to `/admin` (e.g., `/smith-family/admin`)
2. Enter your family's join code to authenticate
3. This opens the admin page where you can manage everyone

### Customizing Categories

1. Tap the **"Customize Categories"** button at the top
2. Rename any category to something more meaningful for your family
3. Hide categories you don't need (the people are preserved, just not shown)
4. Changes apply throughout the app

### Welcome Message

You can customize the welcome message that appears at the bottom of the home page:

1. Tap the **"Welcome Message"** button at the top of the admin page
2. Write your personalized message (up to 1000 characters)
3. Use simple formatting:
   - `**text**` for **bold**
   - `*text*` for *italic*
   - `[text](url)` for clickable links
4. Tap **"Save Message"** to apply

If left empty, the default message "We love you, [Name]!" will display.

### Adding a New Person

1. Find the category you want to add someone to
2. Tap the **"+ Add Person"** button for that category
3. Fill in the form with their information
4. Tap **"Add Person"** to save

### Editing Someone's Information

1. Find the person in their category
2. Tap the **pencil icon** next to their name
3. Make your changes in the form
4. Tap **"Save Changes"**

### Uploading a Photo

1. Tap the **camera icon** on someone's avatar
2. Select a photo from your device
3. Use the cropper to adjust the photo
4. Tap **"Save"** to apply the cropped photo

### Recording a Voice Note

1. Tap the **microphone icon** next to someone's name
2. Speak a message about this person
3. Tap again to stop recording
4. The voice note will play when viewing their details

### Linking Partners

For people in the Partners category:
1. Edit the partner's information
2. Use the "Partner of" dropdown to link them to their spouse
3. This creates a connection shown on both people's detail pages

### Photo Tips

- Photos are automatically cropped to a square
- Drag and zoom to position the face in the center
- The preview shows how the photo will look

### Quiz Results Chart

At the bottom of the admin page, you'll find a chart showing Memory Quiz performance over time, helping you track cognitive engagement.

### Returning to Main App

Tap the **"Home"** button at the top of the admin page to return to the main app view.

## Forking & Data Migration

This app is designed to be easily forked and customized for your own family.

**Requirements**: The `DATABASE_URL` environment variable must be set (automatically available in Replit).

### Exporting Data

To export your family data for backup or migration:

```bash
# Export all families
npx tsx scripts/export-family-data.ts

# Export a specific family
npx tsx scripts/export-family-data.ts your-family-slug
```

This creates a JSON file with all your family data, including people, photos, and quiz results. Password hashes and analytics are NOT exported for security.

### Importing Data

To seed a new project with family data:

```bash
# Import data (preserves existing data)
npx tsx scripts/import-family-data.ts family-export.json

# Clear existing data and import fresh (use with caution!)
npx tsx scripts/import-family-data.ts family-export.json --clear
```

**Note**: After importing, you'll need to set new passwords/join codes since these are not exported.

### Creating Your Own Seed File

1. Copy `scripts/seed-template.json` to a new file
2. Customize it with your family information
3. Generate UUIDs for each person and family (use uuidgenerator.net)
4. For photos, encode them as base64 data URIs
5. Import: `npx tsx scripts/import-family-data.ts your-seed.json --clear`

**Tip**: The easiest way to set up your data is to use the admin page to add everyone, then export it as a backup.

## Technical Notes

- The app works on phones, tablets, and computers
- All data is stored in a secure PostgreSQL database
- Photos are stored directly in the database
- Progressive Web App (PWA) support for home screen installation
- No login required for senior users (family members use join codes for admin access)

## Version

**Version 1.2** - December 1, 2025

### Recent Updates (v1.2)
- **Welcome Message**: Customizable message at the bottom of the home page with markdown support
- **Photo Album Improvements**: Album now starts with grandchildren photos for better engagement
- **Category Counts**: Each category button now shows how many people are in that group
- **UI Refinements**: Reorganized home page with Everyone button above Birthdays for easier access

---

*Built with love for families everywhere*
