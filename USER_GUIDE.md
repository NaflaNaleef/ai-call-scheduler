# AI Call Scheduler — User Guide

> A complete guide for clients managing contacts and running AI calling campaigns.

---

## Table of Contents

1. [Getting Started](#1-getting-started)
   - [Creating Your Account](#creating-your-account)
   - [Logging In](#logging-in)
   - [Dashboard Overview](#dashboard-overview)
2. [Managing Contacts](#2-managing-contacts)
   - [Adding a Contact](#adding-a-contact)
   - [Editing a Contact](#editing-a-contact)
   - [Deactivating and Reactivating Contacts](#deactivating-and-reactivating-contacts)
   - [Organising Contacts into Groups](#organising-contacts-into-groups)
3. [Creating Campaigns](#3-creating-campaigns)
   - [Step 1 — Campaign Details](#step-1--campaign-details)
   - [Step 2 — AI Script](#step-2--ai-script)
   - [Step 3 — Schedule](#step-3--schedule)
   - [Step 4 — Data Collection](#step-4--data-collection)
   - [Step 5 — Select Contacts](#step-5--select-contacts)
4. [Launching Campaigns](#4-launching-campaigns)
   - [How to Launch](#how-to-launch)
   - [What Happens After Launch](#what-happens-after-launch)
5. [Campaign Runs](#5-campaign-runs)
   - [Viewing Campaign Runs](#viewing-campaign-runs)
   - [Understanding Run Statuses](#understanding-run-statuses)
   - [Retrying Failed Contacts](#retrying-failed-contacts)
6. [Call Logs](#6-call-logs)
   - [Viewing Call Logs](#viewing-call-logs)
   - [Call Statuses Explained](#call-statuses-explained)
   - [Viewing Transcripts and Recordings](#viewing-transcripts-and-recordings)
   - [Viewing Collected Data](#viewing-collected-data)
7. [Subscriptions](#7-subscriptions)
   - [Available Plans](#available-plans)
   - [Checking Your Usage](#checking-your-usage)
   - [Upgrading Your Plan](#upgrading-your-plan)
8. [Profile & Organisation](#8-profile--organisation)
   - [Editing Your Profile](#editing-your-profile)
   - [Changing Your Password](#changing-your-password)
   - [Organisation Settings](#organisation-settings)

---

## 1. Getting Started

### Creating Your Account

1. Visit the AI Call Scheduler sign-up page.
2. Enter your **first name**, **last name**, **email address**, and a **password**.
3. Click **Sign Up**.
4. Check your email for a verification link and click it to confirm your account.
5. You will be taken to your dashboard automatically.

💡 **Tip:** Use a business email address so your organisation settings are easy to manage later.

---

### Logging In

1. Go to the login page.
2. Enter your **email address** and **password**.
3. Click **Log In**.

If you have forgotten your password:

1. Click **Forgot Password** on the login page.
2. Enter your email address and click **Send Reset Link**.
3. Check your inbox for the reset email and follow the link to choose a new password.

💡 **Tip:** You can also log in using a supported social login (e.g., Google) if your account was created that way.

---

### Dashboard Overview

After logging in you will land on the **Dashboard**. This page gives you a live snapshot of your account activity.

**Stats shown at a glance:**

- **Total Contacts** — The total number of contacts in your account.
- **Active Campaigns** — Campaigns that are currently live or scheduled.
- **Calls Today** — The number of calls the AI has attempted today.
- **Total Campaigns** — All campaigns ever created in your account.

**Recent Call Activity** — A feed of the latest calls made, showing the contact name, campaign, time, and outcome.

**Sidebar — Usage Widget (bottom of the left menu):**

- Shows your **Call Minutes** used vs. your plan limit, colour-coded:
  - Green — usage is healthy.
  - Orange — approaching your limit (80%+).
  - Red — limit reached or nearly reached.
- Shows your **Contacts** count vs. your plan limit.
- A **Manage Plan** link takes you directly to the Subscriptions page.

💡 **Tip:** Your organisation name is shown at the top of the sidebar so you always know which account you are working in.

⚠️ **Note:** If you have reached your contact or call minute limit, the system will prevent new contacts from being added or campaigns from being launched until you upgrade your plan.

---

## 2. Managing Contacts

Contacts are the people your AI campaigns will call. You can find them under **Contacts → All Contacts** in the left sidebar.

---

### Adding a Contact

1. Click the **Add Contact** button (top right of the Contacts page).
2. Fill in the following fields:

   - **First Name** *(required)* — The contact's first name.
   - **Last Name** *(optional)* — The contact's surname.
   - **Phone Number** *(required)* — Must include the country code (e.g., `+61431161407` for Australia). The system validates the format automatically.
   - **Email** *(optional)* — A valid email address for the contact.
   - **Timezone** *(optional)* — The contact's local timezone (e.g., `Australia/Sydney`, `America/New_York`). This helps ensure calls are made at appropriate times.
   - **Groups** *(optional)* — Select one or more groups to assign this contact to at creation time.

3. Click **Save** to add the contact.

⚠️ **Note:** Phone numbers must be entered with the correct country code. The system will show a validation error if the format is not recognised.

> **Plan Limits — Contact Storage:**
> - Free: up to **50** contacts
> - Starter: up to **500** contacts
> - Pro: up to **2,000** contacts
> - Business: **Unlimited** contacts

💡 **Tip:** Only active contacts count toward your plan limit. Deactivated contacts do not use up your allowance.

⚠️ **Note:** A warning banner appears at 80% of your contact limit. When the limit is reached, you must upgrade before adding more contacts.

---

### Editing a Contact

1. From the Contacts list, find the contact you want to update.
2. Click on the contact's name or the **Edit** icon on their row.
3. Update any of the fields (First Name, Last Name, Phone, Email, Timezone, Groups).
4. Click **Save** to apply your changes.

💡 **Tip:** You can search for contacts by name or phone number using the search bar at the top of the Contacts list.

---

### Deactivating and Reactivating Contacts

Contacts are never permanently deleted — they are **deactivated** instead. This keeps your historical call data intact.

**To deactivate a contact:**

1. Find the contact in the list.
2. Click the **Delete** or **Deactivate** button on their row.
3. Confirm the action when prompted.

The contact will be marked as **Inactive** and will no longer be included in new campaign runs.

**To reactivate a contact:**

1. Use the status filter to show **Inactive** contacts.
2. Find the contact and click **Reactivate**.

⚠️ **Note:** Deactivated contacts still count toward your historical call data, but they are excluded from future campaigns until reactivated.

---

### Organising Contacts into Groups

Groups let you target specific sets of contacts in a campaign. You can find Groups under **Contacts → Groups**.

**Creating a Group:**

1. Click **Create Group**.
2. Enter a **Group Name**.
3. Click **Save**.

**Adding Contacts to a Group:**

1. Open the group from the Groups list.
2. Click **Add Contacts**.
3. Search for and select the contacts you want to add.
4. Click **Confirm**.

**Removing Contacts from a Group:**

1. Open the group.
2. Find the contact in the group's member list.
3. Click the **Remove** button next to their name.

**Renaming or Deleting a Group:**

1. Open the group.
2. Click **Rename** to change the group name, or **Delete** to remove the group entirely.

⚠️ **Note:** Deleting a group does **not** delete the contacts inside it — only the group itself is removed. Contacts remain in your account.

💡 **Tip:** Use groups to segment your contacts (e.g., "Leads", "Existing Customers", "Follow-Up List") so campaigns can target exactly the right people.

---

## 3. Creating Campaigns

A **Campaign** is a set of instructions that tells the AI who to call, what to say, when to call, and what information to collect. Campaigns are created using a step-by-step wizard.

Go to **Campaigns** in the sidebar and click **Create Campaign**.

---

### Step 1 — Campaign Details

This step gives the campaign its identity.

- **Campaign Name** *(required)* — A clear, descriptive name so you can find it later. Example: `Summer Re-engagement 2026`.

Click **Next** to continue.

---

### Step 2 — AI Script

This is where you define what the AI will say and do during each call.

- **Greeting** *(required)* — The opening message the AI will use when the call connects. Keep it friendly and clear about who is calling. Example: *"Hello, this is an automated call from Acme Corp. I'm calling to follow up on your recent enquiry."*

- **Instructions** *(required)* — Detailed guidance for the AI on how to conduct the call. Describe the purpose of the call, the tone to use, and any questions to ask. Example: *"Ask the contact if they're still interested in our service and invite them to book a callback."*

💡 **Tip:** Be specific in your instructions. The more clearly you describe the goal of the call, the better the AI will perform.

⚠️ **Note:** Once a campaign has been launched it is **locked** and the script cannot be changed. Review your greeting and instructions carefully before launching.

Click **Next** to continue.

---

### Step 3 — Schedule

Choose when the AI will place calls.

There are three schedule types:

#### Immediate

The campaign will begin calling contacts **as soon as it is launched**. No date or time selection is needed.

Best for: one-off outreach that you want to start straight away.

#### Run Once *(Starter plan or higher required)*

The campaign will run **one time** at a date and time you specify.

- **Scheduled Date & Time** *(required)* — Pick the exact date and time you want the campaign to run.

Best for: a specific follow-up blast or a time-sensitive message.

#### Recurring *(Pro plan or higher required)*

The campaign will run **automatically on a repeating schedule** within a time window you define.

Fields for recurring campaigns:

- **Start Date** *(optional)* — The date on which the recurring schedule begins. Leave blank to start immediately on launch.
- **End Date** *(required)* — The date the recurring campaign stops automatically.
- **Active Days** *(checkboxes)* — Select which days of the week the AI is allowed to make calls: MON, TUE, WED, THU, FRI, SAT, SUN.
- **Call Start Time** *(required)* — The earliest time in the day the AI may begin calling (e.g., `09:00`).
- **Call End Time** *(required)* — The latest time in the day the AI may make calls (e.g., `18:00`). No calls will be placed after this time.

⚠️ **Note:** The AI will only call contacts within the active day and time window you set. This is important for respecting contact preferences and local regulations.

💡 **Tip:** Avoid selecting very early morning or late evening call windows unless your contacts expect it.

Click **Next** to continue.

---

### Step 4 — Data Collection *(Optional)*

You can instruct the AI to collect specific pieces of information from each contact during the call. This is optional — if you don't need to collect data, you can skip this step.

**To add a data field:**

1. Click **Add Field**.
2. Fill in the following:

   - **Field Label** *(required)* — A human-readable name for the data point. Example: `Preferred Call Time`.
   - **Field Name** — Auto-generated from the label (used internally). You do not need to change this.
   - **Description** *(optional)* — Tell the AI how to ask for this information. Example: *"Ask the contact when they would prefer to be called back."*
   - **Field Type** *(required)* — Choose the type of answer expected:
     - **Text** — A free-form written response (e.g., a name or address).
     - **Number** — A numeric answer (e.g., quantity, age, amount).
     - **Yes / No** — A simple yes or no response.
     - **Multiple Choice** — A selection from a predefined list of options.
   - **Required** *(toggle)* — Turn this on if the AI must collect this piece of information before ending the call.

3. Click **Add** to save the field.

You can add multiple data fields. They will all be collected by the AI during the call and stored for you to review in the Call Logs.

💡 **Tip:** Keep your data collection list short and relevant. Asking too many questions in one call can reduce call quality and contact satisfaction.

Click **Next** to continue.

---

### Step 5 — Select Contacts

Choose which contacts the campaign will call.

There are two ways to add contacts:

**Option A — By Group**

1. Under **Contact Groups**, select one or more groups.
2. All active contacts in those groups will be added to the campaign automatically.
3. If you want to exclude specific contacts from a group, use the **Exclusions** section to remove them individually.

**Option B — Manual Selection**

1. Under **Manual Contacts**, search for and select individual contacts by name or phone number.
2. Add as many as needed.

A **Total Selected** count is shown so you can confirm how many contacts will be called.

⚠️ **Note:** Only **active** contacts will be called. Deactivated contacts are automatically skipped even if they are in a selected group.

⚠️ **Note:** You cannot launch a campaign with zero contacts selected.

Click **Save Campaign** to save your campaign as a **Draft**.

---

## 4. Launching Campaigns

### How to Launch

A campaign must be in **Draft** status before it can be launched.

1. Go to **Campaigns** in the sidebar.
2. Find the campaign you want to launch.
3. Click **Launch** (or open the campaign and click the **Launch** button).
4. A confirmation prompt will appear — review the details and click **Confirm Launch**.

⚠️ **Note:** Once a campaign is launched it moves to **Locked** status. You will no longer be able to edit the campaign name, script, schedule, or contact list.

⚠️ **Note:** If your account has reached its **call minutes limit**, the launch button will be disabled. You must upgrade your plan before launching.

---

### What Happens After Launch

- **Immediate campaigns** — A campaign run is created and the AI begins placing calls right away.
- **Run Once campaigns** — The campaign is marked as **Scheduled** and the AI will begin at your chosen date and time.
- **Recurring campaigns** — The campaign is marked as **Locked** and the AI will place calls on each active day within your defined time window, beginning on the start date.

Each time the AI dials contacts, a **Campaign Run** is created. You can monitor these from the Campaign Runs page.

💡 **Tip:** After launching, navigate to **Campaign Runs** to watch progress in real time.

---

## 5. Campaign Runs

A **Campaign Run** is a single execution of a campaign — the AI working through its list of contacts and attempting calls. A campaign can have multiple runs (e.g., if contacts are retried, or if it is a recurring campaign with daily runs).

---

### Viewing Campaign Runs

1. Click **Campaign Runs** in the left sidebar.
2. You will see a list of all runs across all your campaigns.
3. Use the **filters** to narrow by status or search by campaign name.
4. Click on any run to open its detail view and see a contact-by-contact breakdown.

Inside a run's detail view you can see:

- The **campaign name** this run belongs to.
- The **run status** (see below).
- A list of every contact, showing their individual call status and how many attempts were made.

---

### Understanding Run Statuses

| Status | What it means |
|---|---|
| **Running** | The AI is actively placing calls right now. |
| **Completed** | The run has finished — all contacts were attempted. |
| **Scheduled** | The run is waiting for its start time. |
| **Paused** | The run has been paused (recurring campaigns only). |
| **Failed** | The run encountered an error and did not complete. |

**Contact statuses within a run:**

| Status | What it means |
|---|---|
| **Queued** | The contact has been sent to the AI system and is waiting for the call to begin. |
| **In Progress** | The AI is currently on a call with this contact right now. |
| **Completed** | The call was connected and the conversation took place. |
| **Pending** | The contact is in the queue, waiting to be called. |
| **Failed** | The call attempt was unsuccessful (line disconnected, invalid number, etc.). |
| **Skipped** | The contact was not reached and has no further attempts scheduled. |

---

### Retrying Failed Contacts

If some contacts were not reached (e.g., the phone was not answered or the line was busy), you can retry them.

1. Open the Campaign Run from the Campaign Runs page.
2. Find the contacts with a **Skipped** or failed status.
3. Click **Retry** to queue those contacts for another attempt.

The system supports up to **3 call attempts** per contact per run (shown as "Attempt 1 of 3", "Attempt 2 of 3", etc.). Once 3 attempts have been made, no further retries are available for that contact in that run.

⚠️ **Note:** Retrying creates a linked follow-up run attached to the original campaign run. All retry attempts are visible in the run history.

💡 **Tip:** For recurring campaigns, the AI will automatically attempt contacts on the next active day — manual retries are more useful for immediate or run-once campaigns.

---

## 6. Call Logs

The **Call Logs** page gives you a record of every individual call attempt made by the AI across all campaigns.

---

### Viewing Call Logs

1. Click **Call Logs** in the left sidebar.
2. You will see a list of all call attempts, sorted by most recent first.
3. Use the filters to narrow results:
   - **Search** — Search by contact name or phone number.
   - **Campaign** — Filter by a specific campaign.
   - **Status** — Filter by call outcome (Answered, Failed, No Answer, etc.).

Click on any row to open the **Call Detail drawer** for full information about that call.

---

### Call Statuses Explained

| Status | What it means |
|---|---|
| **Answered** | The contact picked up and the AI had a conversation. This is a successful call. |
| **No Answer** | The phone rang but nobody answered. |
| **Busy** | The line was busy at the time of the call. |
| **Voicemail** | The call reached a voicemail inbox. |
| **Failed** | The call could not be connected (e.g., number invalid, network error). |
| **Pending** | The call is queued and has not been attempted yet. |

💡 **Tip:** An **Answered** status means the AI successfully engaged with the contact, but check the transcript to see how the conversation went and whether data was collected.

---

### Viewing Transcripts and Recordings

Inside the **Call Detail** drawer:

- **Transcript** — A full text record of the conversation between the AI and the contact. Transcripts can be long; click to expand or collapse sections.
- **Recording** — If a recording was made, an audio player will appear so you can listen to the call directly in the browser.
- **Voicemail Detected** — A badge is shown if the system detected that the call went to voicemail rather than a live person.

⚠️ **Note:** Not all calls will have transcripts or recordings. Availability depends on your plan and the call outcome. Calls that were not answered will not have transcripts.

---

### Viewing Collected Data

If your campaign had **Data Collection** fields set up, the answers gathered during the call are shown in the Call Detail drawer under **Collected Data**.

- Each field label and its collected value is displayed as a list.
- If a required field was not collected (e.g., the contact ended the call early), it will show as blank or missing.

💡 **Tip:** Use Collected Data to follow up with contacts based on what they shared during the call — for example, scheduling callbacks, updating records, or routing leads.

---

## 7. Subscriptions

The Subscriptions page is where you view your current plan, monitor your usage, and upgrade if needed.

---

### Available Plans

| Plan | Monthly Price | Contacts | Campaigns | Call Minutes / Month | Priority Support | Advanced Analytics |
|---|---|---|---|---|---|---|
| **Free** | $0 | 50 | 3 | 60 min | No | No |
| **Starter** | $29 | 500 | 10 | 500 min | No | No |
| **Pro** | $79 | 2,000 | 50 | 2,000 min | Yes | Yes |
| **Business** | $199 | Unlimited | Unlimited | 10,000 min | Yes | Yes |

⚠️ **Note:** Call minutes are tracked per calendar month and reset at the start of each billing period.

⚠️ **Note:** On the **Free** plan, you are limited to 3 campaigns and 60 call minutes per month. This is suitable for testing but not for ongoing outreach.

---

### Checking Your Usage

1. Click **Subscriptions** in the left sidebar.
2. Your current plan and its limits are shown at the top.
3. Below, you will see your usage for the current period:
   - **Call Minutes Used** — How many minutes have been consumed this month.
   - **Contacts** — How many contacts are currently in your account.
   - **Campaigns** — How many campaigns you have created.

The sidebar also shows a live usage summary at all times (bottom of the left menu), so you can keep an eye on limits without navigating away.

💡 **Tip:** If you regularly approach your call minutes limit mid-month, consider upgrading to the next plan before campaigns start failing due to exhausted minutes.

---

### What Happens When You Reach Your Limit

**Call Minutes Exhausted:**

- Any campaign that tries to launch will be blocked until your minutes reset or you upgrade.
- Recurring campaigns will be paused automatically and resume on the next cycle after upgrading.
- Immediate and Run Once campaigns will show as completed — you can retry them after upgrading.
- Call minutes reset on the 1st of each month.

**Contact Limit Reached:**

- The **Add Contact** button will be disabled.
- You must upgrade your plan or deactivate existing contacts to free up space.

**Campaign Limit Reached:**

- You cannot launch new campaigns.
- Existing launched campaigns continue running.

---

### Upgrading Your Plan

1. Go to **Subscriptions** in the sidebar.
2. Review the available plans.
3. Click **Upgrade** (or **Change Plan**) next to the plan you want.
4. Follow the payment steps to complete the upgrade.
5. Your new plan limits take effect immediately after payment.

**Billing history** is also available on the Subscriptions page. Each invoice shows:

- Date
- Amount
- Status: **Paid**, **Pending**, or **Failed**

⚠️ **Note:** If a payment fails, your plan may revert to the previous tier. Check for a **Failed** status in your billing history and update your payment details if needed.

---

## 8. Profile & Organisation

---

### Editing Your Profile

Your profile holds your personal account information.

1. Click **Profile** in the left sidebar.
2. You can update:
   - **First Name**
   - **Last Name**
   - **Email Address**
3. Click **Save Changes** to apply.

---

### Changing Your Password

1. Go to **Profile** in the sidebar.
2. Scroll to the **Password** section.
3. Enter your **Current Password**.
4. Enter your **New Password** and confirm it.
5. Click **Update Password**.

⚠️ **Note:** If you signed up using a social login (e.g., Google), the password change option may not be available.

💡 **Tip:** Use a strong, unique password of at least 12 characters, combining letters, numbers, and symbols.

---

### Organisation Settings

Your **Organisation** is the account that all your campaigns, contacts, and data belong to. Organisation settings affect the entire account, not just your personal profile.

1. Go to **Profile** in the sidebar.
2. Scroll to the **Organisation** section.
3. You can update:
   - **Organisation Name** — The name displayed in the sidebar and on call communications.
   - **Timezone** — The default timezone used by the organisation. This affects when scheduled campaigns and recurring call windows are calculated.

4. Click **Save** to apply changes.

⚠️ **Note:** The organisation timezone is important for **recurring campaigns**. If contacts are in different time zones, consider setting the organisation timezone to match your primary operating region, and use individual contact timezones for finer control.

💡 **Tip:** Keeping your organisation name accurate helps identify your business on outbound calls and in your account settings.

---

*For further assistance, please contact your account manager or visit the support centre.*
