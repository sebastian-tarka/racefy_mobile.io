● Refresh Events Usage Guide

How to use

1. Emit a refresh after a mutation (create/update/delete):                                                                                                                                                                  
   import { emitRefresh } from '../../services/refreshEvents';

// After successful API call:                                                                                                                                                                                               
await api.updatePost(postId, data);                                                                                                                                                                                         
emitRefresh('feed');                                                                                                                                                                                                        
navigation.goBack();

2. Listen for refresh in a list/detail screen:                                                                                                                                                                              
   import { useRefreshOn } from '../../services/refreshEvents';

// Inside your component, call the hook with a refresh function:                                                                                                                                                            
useRefreshOn('feed', refresh);

Available event types

'feed' | 'events' | 'activities' | 'profile'

How to extend

Add a new event type:

1. Add the type to RefreshEventType in src/services/refreshEvents.ts:                                                                                                                                                       
   type RefreshEventType = 'feed' | 'events' | 'activities' | 'profile' | 'notifications';

2. Emit it from the screen/hook that performs the mutation:                                                                                                                                                                 
   emitRefresh('notifications');

3. Listen in the screen that should refresh:                                                                                                                                                                                
   useRefreshOn('notifications', fetchNotifications);

Rules of thumb

- Emit before navigation.goBack() so listeners receive the event while still mounted
- Pass a stable callback to useRefreshOn (use useCallback or a ref-stable function like those from custom hooks)
- Only emit for user-initiated mutations, not for polling or background syncs  