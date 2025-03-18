Here is a file detailed how to flow should be the for the learn.tsx file UX:

The user opens the file, we go into the db and get the current lesson they are on, we then pull the content for that id,
in the data we read in from the data field, from the data we get the video id and the clip start and clip end and then we initialzie the youtube player 
and we have our checks to obvisouly just be playing the youtube video from the start time and the end time and when it reaches the end of the specified 
time we send the youtube video back to the specefied start time, its very simple logic.

We then have the captions from the data where their time stamps are keyed from the local times of the clip in realtion to the time of the clip itself,
so we need to write logic to have the times from the captions be adjusted to be inrealtion to the seconds of the actual video that we are pulling in from
youtube, using the second ques that we get for clip start and end.

No when the user swipes up to go to the next video, we pull the new fields from supabse for the content, REFRESH EVERY FIELD THAT NEEDS TO BE REFRESHED FOR 
THE NEW VIDEO, WHEN WE SWIPE UP THE NEXT VIDEO ALL THE STATES AND YOUTUBE PLAYER NEED TO BE REFRESHED AS WE ARE ON A NEW VIDEO NOW. 

HERE IS AN EXAMPLE OF WHAT A DATA JSON FIELD LOOKS LIKE FROM THE CONTENT TABLE

{
  "video": {
    "id": "RQLfUgbQxIs",
    "length": 19,
    "clipEnd": 219,
    "captions": [
      {
        "localEnd": 1.2,
        "localStart": 0.05,
        "nativeLangLine": "Commemorative fountains.",
        "targetLangLine": "Fuentes conmemorativas."
      },
      {
        "localEnd": 8.21,
        "localStart": 1.2,
        "nativeLangLine": "A quite unperturbing and pleasant fact.",
        "targetLangLine": "Vaya dato nada perturbador y agradable."
      },
      {
        "localEnd": 9.24,
        "localStart": 8.23,
        "nativeLangLine": "Oh, that yes.",
        "targetLangLine": "Oye, ese Sí."
      },
      {
        "localEnd": 12.06,
        "localStart": 9.24,
        "nativeLangLine": "What if we jump in to swim? What's next?",
        "targetLangLine": "¿Y si nos metemos a nadar? Que procede."
      },
      {
        "localEnd": 12.24,
        "localStart": 12.06,
        "nativeLangLine": "What's happening?",
        "targetLangLine": "¿Qué pasa?"
      },
      {
        "localEnd": 15.26,
        "localStart": 12.24,
        "nativeLangLine": "They quickly bust you in the Peruvian prison.",
        "targetLangLine": "Sacan al toque en la cárcel peruana."
      },
      {
        "localEnd": 17.08,
        "localStart": 15.28,
        "nativeLangLine": "Let's avoid Peruvian jail. Let's see.",
        "targetLangLine": "Evitemos la cárcel peruana. A ver."
      },
      {
        "localEnd": 18.12,
        "localStart": 17.08,
        "nativeLangLine": "We don't want a chicken",
        "targetLangLine": "No queremos que un pollo"
      },
      {
        "localEnd": 19.1,
        "localStart": 18.12,
        "nativeLangLine": "to scratch us at night.",
        "targetLangLine": "en la noche nos rasque."
      }
    ],
    "clipStart": 200,
    "highlightPhrase": "nos metemos a nadar"
  },
  "context": {
    "choices": [
      {
        "text": "A group of friends near a public fountain at night",
        "isCorrect": true
      },
      {
        "text": "During a business meeting with clients",
        "isCorrect": false
      },
      {
        "text": "At a formal dinner party",
        "isCorrect": false
      }
    ],
    "keyPhrase": "¿Y si nos metemos a nadar?",
    "keyPhraseTranslation": "What if we get in to swim?"
  },
  "cultural": {
    "boxes": [
      {
        "blurb": "Some locals might think it's funny, but security won't let you get away with it.",
        "label": "Reactions"
      },
      {
        "blurb": "You could be fined or even detained—hence the term 'Cárcel peruana!'",
        "label": "Consequences"
      },
      {
        "blurb": "Humor is often exaggerated in Spanish contexts, reflecting local attitudes.",
        "label": "Cultural Insight"
      }
    ],
    "title": "What happens if you jump into a public fountain in Peru?"
  },
  "conversational": {
    "responsePrompt": "¿Y si nos metemos a nadar?",
    "speakingPhrase": "nos metemos a nadar",
    "responsePromptTranslation": "What if we get in to swim?",
    "speakingPhraseTranslation": "we get in to swim"
  }
}