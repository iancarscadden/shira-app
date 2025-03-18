This document outlines the need of the revenue cat services in our expo react native app using supabase.

Our app needs to have subscriptions, a weekly, monthy, and annual subscrption. I have made these subscriptions in app store connect. Here is what they are called:

Order
Reference Name
Product ID
Duration
Status
1
Weekly Shira Pro
weekly_shira_pro
1 week
Ready to Submit
2
Monthy Shira Pro
monthy_shira_pro
1 month
Ready to Submit
3
Annual Shira Pro
annual_shira_pro
1 year
Ready to Subm

now here is what they are called in revenue cat as i have linked them:

here is the revenue cat entitlement information: 

Entitlements
Manage Entitlements across all Apps

An Entitlement represents a level of access, features, or content that a Customer is "entitled" to. Many Projects only have one Entitlement, for example, "Pro access".

Identifier	Description	Products	Created
Shira Pro
Unlocks access to features in Shira - Spanish Video Lessons
3 products
Mar 07, 2025    

Now here is what the revenue cat "products" page has for its information:

Products
Add Products to your apps

Products are the individual in-app purchases you set up on the store platforms (e.g., Apple, Google).

​
Search products...

Shira - Spanish Video Lessons (App Store)


Status		
Annual Shira Pro

annual_shira_pro

Ready to Submit

1 Entitlement
Mar 10, 2025
Monthy Shira Pro

monthy_shira_pro

Ready to Submit

1 Entitlement
Mar 10, 2025
Weekly Shira Pro

weekly_shira_pro

Ready to Submit

1 Entitlement
Mar 10, 2025

Now here is the information in the "offerings" for revenue cat dashboard:

Offerings
Manage Offerings across all Apps

Offerings are the selection of products that are "offered" to a Customer on your paywall. They're an optional, but recommended feature of RevenueCat that can make it easier to change and experiment with your paywalls.

Offerings can also be used to test different pricing combinations as variants in an Experiment. Learn more.

Identifier	Description	Packages	Created	Actions
default
Shira Pro Packages
3 packages
Mar 10, 2025	


now here is my revenue cat sdk api key:

appl_zRRgtqSictCpKyyscMdIjxjasqd

here is the revenue cat project id if it is needed: a3abfc4f

now here is the information on the revenue cat paywalls dashboard where it contains the paywall i have built. : Original Paywalls (v1)

Customize our original, native, remotely configurable paywall templates.

Offering Identifier	Offering Description	Template	Created	Action
default
Shira Pro Packages
4 - Persian	Mar 11, 2025	


Continue to expplain. here is what we want to do. we want to initialize revenue cat in our shira_app folder as that is our expo project. we first want to look over the codeabse and understand how it is put togeather, we can list the file directories and investigate and find what we need to do so implement this. we also have a file called paywall.tsx that we can change to be the paywall that comes from revenue cat.