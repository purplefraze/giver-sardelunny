# Publish Giver as a fully interactive app

Goal: make the prototype publicly accessible so friends can sign up, build profiles, publish posts, message each other, and use all interactive features.

## Steps

1. **Confirm publish visibility is public**  
   Check `publish_settings--get_publish_settings`. If `effective_publish_visibility` is private, switch it to public with `publish_settings--update_visibility` so the published URL is reachable by anyone with the link (not just workspace members).

2. **Check security scan gate**  
   Call `security--get_scan_results` to see if any critical findings block publishing. If any are unresolved, surface them to you before proceeding.

3. **Publish the app**  
   Call `preview_ui--publish`. This starts a real deployment to a permanent `.lovable.app` URL. Frontend updates later require clicking **Update** in the publish dialog; backend changes deploy automatically.

4. **Deliver the live URL**  
   Return the published URL once the deployment is scheduled.

No source files are modified for this task.