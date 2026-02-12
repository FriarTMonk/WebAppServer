# The Parable of the Open Ticket - Design Document

**Date**: 2026-02-12
**Status**: Ready for Implementation
**Category**: Identity / Boundaries
**Read Time**: 4-5 min
**Scripture**: Galatians 1:10 (main), Colossians 3:23-24 (application)
**Tags**: people-pleasing, boundaries, identity, approval, work

---

## Overview

A modern parable about a junior DevOps engineer whose people-pleasing leads to burnout and a critical failure, forcing him to confront the question: "Who are you when no one's asking you for something?"

## Story Structure

### Opening: Meet Eli

Eli is the junior DevOps engineer everyone loves - always smiling, always available, always says yes. "Sure, I can take that." "No problem, I'll handle it." "Don't worry, I've got it." The team loves him because he makes their lives easier. He stays late, picks up tickets others don't want, volunteers for weekend deployments. He's helpful, pleasant, present.

But we see cracks: Calendar notifications he dismisses. A list of tasks that keeps growing. Coffee cups accumulating on his desk. He's agreeing to conflicting priorities from different managers but hasn't told either one.

### The Yes-Spiral

We watch Eli's commitments multiply. He's monitoring three different projects, supporting two teams, and somehow became the go-to person for "quick favors." Each yes feels small in the moment, but they compound.

He starts missing things. Small things at first - a delayed response, a meeting he forgot to prep for. He apologizes profusely, works even later to catch up, says yes to the next request to prove he's still reliable.

The spiral tightens. He's working through lunch, answering Slack messages at 11 PM, coming in on Saturdays. His personal life starts disappearing - missed gym sessions, cancelled dinners with friends, a text from his sister he hasn't returned in two weeks.

But he keeps smiling. Keeps saying "I've got it." Because stopping would mean disappointing someone, and disappointing someone would mean... what? Losing their approval? Proving he's not good enough? Being expendable?

He doesn't let himself answer that question. He just keeps saying yes.

Among all these commitments, there's a routine task that keeps getting pushed to tomorrow: **renewing the SSL certificate for a critical internal service**. It's on his list. He sees the reminder. But there's always something more urgent, someone who needs him right now.

### The Crisis: The Outage

It's Tuesday morning, 6:47 AM. Eli's phone explodes with notifications. The internal service is down. Authentication failing across multiple systems. Engineers can't access deployment tools. The morning standup is chaos.

He knows immediately. The certificate. It expired overnight.

The fix takes 20 minutes. The impact lasts all morning - blocked deployments, delayed releases, frustrated teams. Nothing catastrophic, but very, very visible.

Eli apologizes in every Slack channel. Works through lunch fixing the downstream issues. Stays late documenting what happened. He expects anger, disappointment, maybe a formal reprimand.

Instead, he gets a calendar invitation: "1:1 - Dan" for the next morning.

### The Intervention

Dan, his manager, doesn't start with the outage. He starts with a question: "Eli, how many active projects are you supporting right now?"

Eli rattles off the list. Dan writes them down. The list fills the whiteboard.

"And how many of these did I assign you?"

Eli pauses. "Three."

"So where did the other seven come from?"

"People... asked. And I said yes."

Dan leans back. "Eli, you're a good engineer. But I don't need you to be a good yes-person. This is a thinking job. I need your judgment, your perspective, your ability to say 'I can't take that on right now' when you're at capacity."

Silence.

Then Dan asks the question that breaks something open: **"Who are you when no one's asking you for something?"**

### Administrative Leave & Identity Crisis

Dan doesn't fire Eli. He puts him on administrative leave - paid, one week, mandatory. "You're burned out, and you need space to figure out who you are outside of being needed."

Eli protests. "I can fix this. I'll work harder, I'll—"

"That's the problem, Eli. You can't fix this by doing more. You have to fix this by figuring out what you're actually here to do."

**The Mirror Moment**:

The first two days of leave feel like withdrawal. Eli keeps reaching for his phone to check Slack. He writes apology emails he doesn't send. He makes lists of how he'll prove himself when he returns.

But by day three, in the silence of his apartment with no one asking him for anything, the question finds him again:

*Who am I when no one's asking me for something?*

He tries to answer. Comes up blank. He's been Eli-the-helpful, Eli-the-available, Eli-the-guy-who-never-says-no for so long that he doesn't know what's underneath. His preferences, his opinions, his boundaries - he's erased them all in service of being needed.

It's terrifying. And clarifying.

### Return & Transformation

Monday morning. Eli walks back into the office with a knot in his stomach. He's not sure who he's supposed to be now.

The team welcomes him back - genuine warmth, no resentment. Several people say they missed him. He realizes they actually like *him*, not just his willingness to take their work.

**The Testing Moment**:

Afternoon team meeting. They're planning next quarter's infrastructure updates. The requests start flying:

"Eli, can you own the database migration?"

"Eli, we need someone on the monitoring upgrade."

"Hey Eli, I know you're good with Kubernetes, could you—"

He feels the old pattern trying to reassert itself. The pull to say yes, to be helpful, to prove he's back and reliable. His mouth opens.

Then he hears Dan's question in his head: *Who are you when no one's asking you for something?*

And he hears his own answer, the one he found in the silence: *I don't know yet. But I want to find out.*

"I can take the monitoring upgrade," Eli says slowly. "But I can't take the database migration *and* the Kubernetes project. That's how we got here last time."

The room goes quiet.

Then Dan speaks up: "Eli's right. We need to staff these properly, not pile them on one person because he's willing to drown quietly."

Someone else volunteers for the database work. The Kubernetes project gets pushed to next quarter. The meeting continues.

Eli's hands are shaking under the table. But he said no. And the world didn't end.

### Epilogue

A few weeks later: Eli's working on the monitoring upgrade. Someone asks if he can take on an urgent ticket. He checks his capacity, thinks for a moment, and says, "I can get to it Thursday. If it needs to happen before then, you'll need to assign it to someone else."

The person says "Thursday works, thanks."

Eli closes his laptop at 5:30 PM and goes to the gym for the first time in months. His phone buzzes with a Slack message. He doesn't check it until the next morning.

Small changes. But they're his.

---

## Scripture Tie-In

### Main Verse: Galatians 1:10 (NIV)

"Am I now trying to win the approval of human beings, or of God? Or am I trying to please people? If I were still trying to please people, I would not be a servant of Christ."

### Application

Paul's question cuts to the heart of Eli's crisis: you cannot serve two masters. Every time Eli said yes to gain someone's approval, he was building his identity on shifting sand - on the opinions, needs, and demands of people who could never be fully satisfied.

The people-pleaser's lie is that if you just help enough, do enough, say yes enough times, you'll finally be secure. But human approval is an endless appetite. There's always one more request, one more person to please, one more standard to meet.

Eli's breaking point wasn't the outage - it was the realization that he'd erased himself trying to earn something (approval, security, worth) that can only come from God.

### Colossians 3:23-24 Connection

"Whatever you do, work at it with all your heart, as working for the Lord, not for human masters... It is the Lord Christ you are serving."

When we reframe our work as service to Christ rather than a performance for human approval, everything shifts. We can say no without guilt because we're not trying to prove our worth - we already have it. We can disappoint people because we're not ultimately working for their approval. We can bring our actual thinking, our real voice, our honest capacity - because we're serving an audience of One.

### "Let Your Yes Be Yes" Theme

A yes that comes from people-pleasing isn't really a yes - it's a performance, a manipulation, an attempt to control how others see us. But a yes that comes from knowing who we are in Christ? That's a yes with integrity. And a no from that same place? That's not rejection - it's honesty.

*(Reference: Recent blog post "Let Your Yes Be Yes: Embracing Honesty and Integrity in Everyday Life")*

---

## Subtle Moral

**Primary option**: We can become so addicted to being needed that we forget who we are when no one's asking.

**Alternative (more direct)**: A yes that comes from fear of disappointing others isn't integrity - it's erasure.

*(Consider including both in final version)*

---

## Reflection Question

Who are you when no one's asking you for something? If you can't answer that question, what have you been using people-pleasing to avoid facing? What would it look like to work as unto the Lord rather than for human approval - and what would you need to say no to in order to start?

---

## Implementation Notes

**File location**: `packages/web/content/parables/the-open-ticket.mdx`

**Metadata**:
```yaml
title: "The Parable of the Open Ticket"
slug: "open-ticket"
excerpt: "A story about a DevOps engineer who said yes to everyone until a critical failure forced him to ask: Who am I when no one's asking me for something?"
category: "Identity"
publishedDate: "2026-02-12" (or target publish date)
readTime: "5 min read"
scriptureReference: "Galatians 1:10"
tags: ["people-pleasing", "boundaries", "identity", "approval", "work"]
isFeatured: false
```

**Components to use**:
- `<ParableStory>` - Main narrative
- `<SubtleMoral>` - Moral statement(s)
- `<ScriptureTieIn verse="Galatians 1:10" version="NIV">` - Scripture and application
- `<ReflectionQuestion>` - Reader reflection
- `<ParableCTA />` - Call to action

---

## Future Parable Note

**Next week's parable**: Burnout (workplace/ministry setting)
- Can reference this people-pleasing parable as the pattern that leads to burnout
- Natural progression: people-pleasing → boundary violations → exhaustion → burnout
- Consider church/ministry setting (saved from this parable) to show how burnout affects both secular and sacred spaces
