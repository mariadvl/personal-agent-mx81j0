import logging
from typing import Dict, List, Callable, Any
import asyncio
from datetime import datetime

logger = logging.getLogger(__name__)

class EventBus:
    """
    Implements a simple event bus for asynchronous communication between components
    in the Personal AI Agent. Allows services to publish events and subscribe to
    event types without direct coupling.
    """
    
    def __init__(self, history_limit: int = 100, debug_mode: bool = False):
        """
        Initialize the event bus with empty subscribers dictionary and event history.
        
        Args:
            history_limit: Maximum number of events to keep in history (default: 100)
            debug_mode: Whether to enable verbose logging (default: False)
        """
        self._subscribers: Dict[str, List[Callable]] = {}
        self._event_history: List[Dict[str, Any]] = []
        self._history_limit = history_limit
        self._debug_mode = debug_mode
        logger.info("EventBus initialized with history_limit=%d, debug_mode=%s", 
                    history_limit, debug_mode)
    
    def subscribe(self, event_type: str, handler: Callable) -> None:
        """
        Register a handler function for a specific event type.
        
        Args:
            event_type: The type of event to subscribe to
            handler: The callback function to be called when the event is published
        """
        if event_type not in self._subscribers:
            self._subscribers[event_type] = []
        
        self._subscribers[event_type].append(handler)
        
        if self._debug_mode:
            logger.debug("Subscribed handler %s to event type '%s'", 
                         handler.__name__, event_type)
    
    def unsubscribe(self, event_type: str, handler: Callable) -> bool:
        """
        Remove a handler function for a specific event type.
        
        Args:
            event_type: The type of event to unsubscribe from
            handler: The handler function to remove
            
        Returns:
            True if the handler was removed, False otherwise
        """
        if event_type not in self._subscribers:
            return False
        
        if handler in self._subscribers[event_type]:
            self._subscribers[event_type].remove(handler)
            
            if self._debug_mode:
                logger.debug("Unsubscribed handler %s from event type '%s'", 
                             handler.__name__, event_type)
            return True
        
        return False
    
    def publish(self, event_type: str, payload: Dict[str, Any] = None) -> None:
        """
        Publish an event to all subscribers of the event type.
        
        Args:
            event_type: The type of event to publish
            payload: The data associated with the event (default: None)
        """
        if payload is None:
            payload = {}
        
        # Create event object
        event = {
            "type": event_type,
            "payload": payload,
            "timestamp": datetime.now().isoformat()
        }
        
        # Add to history
        self._event_history.append(event)
        
        # Trim history if needed
        if len(self._event_history) > self._history_limit:
            self._event_history = self._event_history[-self._history_limit:]
        
        if self._debug_mode:
            logger.debug("Published event '%s' with payload: %s", 
                         event_type, payload)
        
        # Notify subscribers
        if event_type in self._subscribers:
            for handler in self._subscribers[event_type]:
                try:
                    handler(event)
                except Exception as e:
                    logger.error("Error in event handler %s for event '%s': %s", 
                                 handler.__name__, event_type, str(e))
    
    async def publish_async(self, event_type: str, payload: Dict[str, Any] = None) -> None:
        """
        Publish an event asynchronously to all subscribers.
        
        Args:
            event_type: The type of event to publish
            payload: The data associated with the event (default: None)
        """
        if payload is None:
            payload = {}
        
        # Create event object
        event = {
            "type": event_type,
            "payload": payload,
            "timestamp": datetime.now().isoformat()
        }
        
        # Add to history
        self._event_history.append(event)
        
        # Trim history if needed
        if len(self._event_history) > self._history_limit:
            self._event_history = self._event_history[-self._history_limit:]
        
        if self._debug_mode:
            logger.debug("Published async event '%s' with payload: %s", 
                         event_type, payload)
        
        # Notify subscribers asynchronously
        if event_type in self._subscribers:
            tasks = []
            for handler in self._subscribers[event_type]:
                try:
                    if asyncio.iscoroutinefunction(handler):
                        task = asyncio.create_task(handler(event))
                    else:
                        task = asyncio.create_task(asyncio.to_thread(handler, event))
                    tasks.append(task)
                except Exception as e:
                    logger.error("Error creating task for event handler %s for event '%s': %s", 
                                 handler.__name__, event_type, str(e))
            
            # Wait for all handlers to complete
            if tasks:
                try:
                    await asyncio.gather(*tasks)
                except Exception as e:
                    logger.error("Error in async event handlers for event '%s': %s", 
                                 event_type, str(e))
    
    def get_event_history(self, event_type: str = None) -> List[Dict[str, Any]]:
        """
        Retrieve the recent event history, optionally filtered by event type.
        
        Args:
            event_type: If provided, only return events of this type
            
        Returns:
            List of recent events, optionally filtered by type
        """
        if event_type:
            return [event for event in self._event_history if event["type"] == event_type]
        return self._event_history.copy()
    
    def clear_event_history(self) -> None:
        """
        Clear the event history.
        """
        self._event_history = []
        
        if self._debug_mode:
            logger.debug("Event history cleared")
    
    def get_subscriber_count(self, event_type: str) -> int:
        """
        Get the number of subscribers for an event type.
        
        Args:
            event_type: The type of event to check
            
        Returns:
            Number of subscribers for the event type
        """
        if event_type in self._subscribers:
            return len(self._subscribers[event_type])
        return 0
    
    def set_debug_mode(self, enabled: bool) -> None:
        """
        Enable or disable debug logging.
        
        Args:
            enabled: Whether to enable debug logging
        """
        self._debug_mode = enabled
        logger.info("EventBus debug mode set to %s", enabled)