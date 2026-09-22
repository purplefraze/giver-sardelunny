# Giver Dev Prototype

Build a fresh mobile-first prototype for an app called Giver.

I am attaching an image of the Living G.

There are two things that matter enormously in this build:

The exact visual geometry of the attached Living G.

The interaction system described below.

Do not reinterpret either.

1. THE LIVING G IS A FIXED DESIGN ASSET

The attached image is NOT inspiration.

It is NOT a rough reference.

It is NOT an invitation to design your own lowercase G.

Treat the attached Living G as a fixed design asset whose geometry must be reproduced as faithfully as technically possible.

Trace/reconstruct the actual geometry of the reference.

Preserve:

its silhouette

proportions

stroke relationships

circle sizes

spacing

openings

connections

alignment

Do NOT substitute a font glyph.

Do NOT generate a different lowercase g.

Do NOT approximate it with three generic circles.

Do NOT alter its geometry to make implementation easier.

Build it as a reusable SVG/component.

If necessary, use separate invisible interactive hit areas over the SVG so that different regions can be tapped independently without changing the visible G geometry.

This distinction is important:

VISIBLE G = fixed geometry.

INTERACTION LAYER = invisible hit areas positioned over that geometry.

The G must therefore look exactly the same regardless of which regions are interactive.



2. THE CORE IDEA

Giver is a community based around:

Wishing. Giving. Trading.

Its philosophy is:

Kindness is currency.

Giver uses an internal community energy called:

Sparks

For this prototype, do not build a complicated Spark economy.

We only need enough Sparks functionality to demonstrate the onboarding experience described below.



3. ONBOARDING — WELCOME TO GIVER

Do NOT begin onboarding with three generic cards explaining Wish, Give and Trade.

Instead, begin with the new member.

Create a beautiful minimal opening screen:

Welcome to Giver.

Then introduce their welcome Sparks.

The copy should feel warm, playful and human.

Use copy along these lines:

Lucky you.

Thanks for joining the Giver community.

You’ve got 100 Sparks to start.

But here’s the catch:

50 are yours to use.

50 are yours to give away.

Then:

Want to make your first act of generosity now?

Provide two choices:

Let’s give

and a much quieter secondary action:

Maybe later

Do not make this feel like banking.

Do not call this a wallet.

Do not use financial terminology.

Sparks should feel like energy being put into a community.



4. MEET REAL GIVER MEMBERS

If the user chooses Let’s give, introduce them to three example Giver members.

Do NOT present them as generic rectangular marketplace cards.

This should feel like meeting people.

Create three example members:

Maya

John

and a third person.

Each person should have:

profile photo/avatar

name

tiny amount of human profile information

one example of how they participate in Giver

Across the three people, demonstrate:

one person Wishing

one person Giving

one person Trading

The user should be able to move through the three people.

Keep the experience visual, playful and extremely simple.



5. PREVIEWING ANOTHER PERSON’S G

When viewing Maya, John, or the third example person, we can begin introducing the visual language of the Living G.

Their profile may use the Living G as a visual framework.

For another person’s G:

TOP REGION

Show something current/relevant from that person.

For example:

Latest Wish

or their current Give/Trade depending on that example member.

MIDDLE REGION

Their profile picture / identity.

BOTTOM REGION

Their About Me.

These regions should be independently tappable.

For example:

Tap the person’s current activity → see their Wish/Give/Trade.

Tap their picture → focus on their identity/profile.

Tap About Me → reveal a short human introduction.

Do not create enormous profile pages.

Keep this intimate and visual.



6. GIVE AWAY THE 50 WELCOME SPARKS

During this onboarding sequence, allow the new user to choose one of these people to receive their 50 give-away Sparks.

For example, the user chooses Maya.

The interaction should feel delightful.

Do not use a generic success modal.

Do not use banking language.

Do not say “transaction successful.”

Instead, create a small celebratory interaction.

Use:

a satisfying animation

subtle motion

haptic feedback where supported

a playful Spark response

Then human copy along the lines of:

Yippee.

You just made your first act of generosity on Giver.

Or another similarly short, warm phrase.

The exact wording can be refined later.

The important emotional idea is:

Before the person has even asked Giver for anything, they have already given something.

That is fundamental to the onboarding.

Then transition them naturally into Giver.



7. ENTERING GIVER

After onboarding, the user enters the main Giver experience.

The entire primary navigation system is based around:

THREE LIVING Gs.

There are three horizontally connected worlds:

COMMUNITY — HOME — PROFILE

Home starts in the center.

Each world is represented primarily by its own large Living G.

The same underlying G geometry should be reused.

However, each G can have its own colour story.

The user moves horizontally between these three Gs.



8. HOME G — THE ACTION G

The CENTER G is the primary Giver interface.

This G should be VERY LARGE.

It should dominate the phone.

It is not a logo.

It is the interface.

Use the attached Living G geometry.

The three regions are:

TOP

SEARCH

MIDDLE

WISH

BOTTOM

GIVE

Each region MUST be independently tappable.

Do not merely make the entire G one button.

Do not require tiny precise taps on the visible stroke.

Create generous invisible hit areas over each region.

When pressing a region, provide a subtle visual/physical response.

For this prototype:

Search → opens a minimal Search screen

Wish → opens a minimal Wish creation experience

Give → opens a minimal Give creation experience

The purpose right now is to prove that the G itself works as navigation.



9. PROFILE G — MY G

Swipe RIGHT from Home to reach:

MY PROFILE

This screen should ALSO be built around the Living G.

Do not replace it with a generic profile page.

This is the user’s personal G.

Use the same canonical G geometry, but give this G its own colour treatment.

For the Profile G:

TOP REGION

MY ACTIVITY

Show/reveal the user’s latest Wish/Give/Trade or recent Giver activity.

MIDDLE REGION

ME

The user’s profile picture / identity.

BOTTOM REGION

ABOUT ME

Tapping the bottom region reveals the user’s short About Me information.

This means Profile itself feels like a Living G rather than a social-media profile page.

Keep it extremely minimal.



10. COMMUNITY G

Swipe LEFT from Home to reach:

COMMUNITY

Community should ALSO be represented by a Living G.

Use the same canonical geometry with another distinct colour treatment.

For the Community G:

TOP REGION

COMMUNITY MAP

This will eventually represent what’s happening nearby.

For now it can open a simple placeholder.

MIDDLE REGION

COMMUNITY WISHES

Tap to see a minimal sample of what people nearby are wishing for.

BOTTOM REGION

COMMUNITY GIVES

Tap to see a minimal sample of what people nearby are giving.

Do NOT turn Community into Search.

Do NOT add category filters.

Do NOT add distance sliders yet.

Do NOT create a generic marketplace feed.

The Community G itself is the primary interface.



11. THE THREE-G SYSTEM

This is the central interaction concept.

The user should experience:

COMMUNITY G ← HOME G → PROFILE G

depending on swipe direction.

All three screens share the SAME canonical Living G geometry.

But each can use a DIFFERENT bold colour story.

This should create the feeling that Giver has one visual language that changes meaning depending on context.

HOME G

Search
Wish
Give

PROFILE G

My Activity
Me
About Me

COMMUNITY G

Community Map
Community Wishes
Community Gives

The repeated geometry is intentional.

Do NOT replace any of these with conventional dashboards or menus.



12. HORIZONTAL SWIPING

Implement the three-G horizontal navigation properly.

Home begins in the center.

From Home:

Swipe RIGHT → Profile

Swipe LEFT → Community

Swiping back returns to Home.

The interaction must snap completely to each screen.

It must NEVER stop halfway between screens.

It must NEVER leave half of one G and half of another visible after the gesture ends.

There must be no horizontal overflow bugs.

Optimize this specifically for an iPhone-sized mobile viewport.



13. COLOUR

Each of the three G worlds should have a distinctive bold colour treatment.

Use:

solid colour

white space

black where appropriate

high contrast

no gradients

Do not make the colours random decoration.

The three Gs should feel related but distinct.

For now, choose a coherent prototype palette that can easily be changed later using CSS variables/design tokens.

Do not hardcode colours throughout individual components.



14. SIZE OF THE G

This is critical.

MAKE THE G BIGGER THAN YOU THINK IT SHOULD BE.

The previous prototypes made the Living G too small.

The G should visually dominate each of the three primary screens.

It should use most of the available mobile canvas while still fitting comfortably.

It should feel immersive.

Do not put a small G in the middle of a giant empty page.

Do not surround it with unnecessary interface chrome.



15. PRESS INTERACTION

Every functional region of every Living G must actually respond to touch.

Use large invisible hit targets.

When the user presses a region:

slight scale/swell response

subtle visual response

haptic feedback where supported

then perform the action

Test all three regions individually.

Do NOT mark this build complete if tapping different parts of the G all triggers the same action.



16. VISUAL STYLE

Giver should feel:

bold

playful

contemporary

artistic

simple

human

unusual

optimistic

Use:

enormous Helvetica-like typography

lots of white space

bold solid colour

thick clean lines

large touch targets

minimal copy

restrained animation

Avoid:

gradients

glassmorphism

generic SaaS cards

conventional dashboards

bottom tab bars

hamburger menus

generic marketplace design

excessive buttons

tiny text

financial-app styling



17. DO NOT OVERBUILD

For this prototype, DO NOT build:

Supabase

authentication

real database logic

real Spark ledger

complicated Spark transactions

borrowing/lending

messaging

ratings

moderation

location permissions

complex search

complex Wish/Give forms

category systems

filters

backend infrastructure

Use realistic mock data where necessary.

We are testing the Giver interaction language, not building production infrastructure.



18. DO NOT INVENT

Do not invent new Giver product rules.

Do not add conventional app features simply because you think an app normally needs them.

If something is unspecified, keep it minimal.

Most importantly:

Do not redesign the Living G.



BUILD CHECKLIST — TEST THIS YOURSELF

Before presenting the build, verify every item below.

ONBOARDING

Welcome to Giver appears.

User receives 100 Sparks.

50 are communicated as theirs to use.

50 are communicated as theirs to give.

User can choose Let’s give or Maybe later.

Let’s give introduces three people.

Across those people I see Wish, Give and Trade.

I can choose someone to receive my 50 give-away Sparks.

Giving produces a delightful celebratory response.

Then I enter Giver.

HOME G

G is VERY LARGE.

Geometry closely matches the attached reference.

Top responds independently → Search.

Middle responds independently → Wish.

Bottom responds independently → Give.

PROFILE G

Swipe right from Home reaches Profile.

Profile is represented by another Living G.

Top = My Activity.

Middle = Me/profile picture.

Bottom = About Me.

Each region responds independently.

COMMUNITY G

Swipe left from Home reaches Community.

Community is represented by another Living G.

Top = Community Map.

Middle = Community Wishes.

Bottom = Community Gives.

Each region responds independently.

SWIPING

Community, Home and Profile snap perfectly.

No half-screen states.

No horizontal overflow.

No chopped text or Gs.

If these interactions do not work, fix them before considering the prototype complete.

FINAL PRINCIPLE

I do not want you to show me how many features you can build.

I want you to demonstrate that you understand the interaction language of Giver:

One shape.

Three Gs.

Different meanings.

Kindness is currency.

Do you gave any questions?

This project was built with [Lovable](https://lovable.dev).

**Live app**: https://giver-sardelunny.lovable.app

## Build with Lovable

Continue developing this project in the [Lovable editor](https://lovable.dev/projects/c68cfc0b-5cbf-4de6-baaf-5193d583eaba).

- **Ship faster**: describe what you want to build and Lovable handles the code.
- **Stay in sync**: every change made in Lovable is committed straight to this repository.
- **Full ownership**: this code is yours. Push to `main` on GitHub and your changes sync back into Lovable, ready for your next prompt.

## Development

Prefer working locally? You need Node.js and npm — [install with nvm](https://github.com/nvm-sh/nvm#installing-and-updating).

```sh
git clone <this-repository-url>
cd <repository-name>
npm i
npm run dev
```
