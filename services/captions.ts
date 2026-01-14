/**
 * Caption Generation Service
 * Auto-generates aesthetic captions for photo dumps
 */

import { PhotoScore, SceneTag } from '../types';

// Caption templates by vibe
const CAPTION_TEMPLATES = {
    // General vibes
    general: [
        'lately ☁️',
        'a lil photo dump',
        'moments ✨',
        "here's what's been up",
        'caught in 4k',
        'life lately 🌙',
        'just vibes',
        'living my best life fr',
        'no thoughts just vibes',
        'dump it 📸',
        'core memories only',
        'random camera roll moments',
    ],

    // Seasonal/time-based
    seasonal: {
        winter: ['winter dump ❄️', 'cold weather vibes', 'cozy season'],
        spring: ['spring awakening 🌸', 'bloom szn', 'fresh starts'],
        summer: ['hot girl summer', 'sun-kissed ☀️', 'summer state of mind'],
        fall: ['fall feels 🍂', 'sweater weather', 'autumn aesthetic'],
    },

    // Activity-based
    activity: {
        travel: ['wanderlust mode on', 'exploring ✈️', 'adventure awaits', 'out of office'],
        food: ['ate good lately', 'foodie dump 🍕', 'we eating good'],
        party: ['we go out', 'nights out 🌙', 'living for the weekend'],
        chill: ['soft life era', 'taking it slow', 'peace & quiet'],
    },

    // Mood-based
    mood: {
        happy: ['pure serotonin', 'good vibes only', 'manifesting happiness ✨'],
        nostalgic: ['miss these days', 'core memories', 'the good old days'],
        aesthetic: ['main character energy', 'curated chaos', 'carefully unhinged'],
        chaotic: ['unfiltered dump', 'messy but make it art', 'chaos coordinator'],
    },

    // Weekly specific
    weekly: [
        'this week in pics',
        'weekly roundup',
        'seven days of chaos',
        'week recap ✨',
        'another week another dump',
    ],

    // Monthly specific
    monthly: [
        'monthly photo dump',
        '30 days summarized',
        'this month was...',
        'monthly core memories',
    ],
};

// Emoji mappings for scene types
const SCENE_EMOJIS: Partial<Record<SceneTag, string[]>> = {
    sunset: ['🌅', '🌇', '✨'],
    food: ['🍕', '🍜', '☕', '🍰'],
    pet: ['🐕', '🐈', '🐾'],
    nature: ['🌿', '🏔️', '🌊'],
    outdoors: ['🌳', '☀️', '🚶'],
    night: ['🌙', '✨', '🌃'],
    selfie: ['📸', '✨', '💅'],
    group: ['👯', '🫶', '💕'],
};

/**
 * Detect the dominant vibe from photo scores
 */
function detectDominantVibe(scores: PhotoScore[]): string {
    const sceneCounts: Partial<Record<SceneTag, number>> = {};

    for (const score of scores) {
        if (score.sceneTag) {
            sceneCounts[score.sceneTag] = (sceneCounts[score.sceneTag] || 0) + 1;
        }
    }

    // Find dominant scene
    let maxScene: SceneTag | null = null;
    let maxCount = 0;

    for (const [scene, count] of Object.entries(sceneCounts)) {
        if (count > maxCount) {
            maxCount = count;
            maxScene = scene as SceneTag;
        }
    }

    // Map scene to vibe
    if (maxScene === 'outdoors' || maxScene === 'nature' || maxScene === 'sunset') {
        return 'travel';
    }
    if (maxScene === 'food') {
        return 'food';
    }
    if (maxScene === 'night' || maxScene === 'flash') {
        return 'party';
    }
    if (maxScene === 'indoors' || maxScene === 'detail') {
        return 'chill';
    }

    return 'general';
}

/**
 * Get current season
 */
function getCurrentSeason(): 'winter' | 'spring' | 'summer' | 'fall' {
    const month = new Date().getMonth();

    if (month >= 2 && month <= 4) return 'spring';
    if (month >= 5 && month <= 7) return 'summer';
    if (month >= 8 && month <= 10) return 'fall';
    return 'winter';
}

/**
 * Generate random emoji string based on scenes
 */
function generateEmojis(scores: PhotoScore[]): string {
    const emojis: string[] = [];

    for (const score of scores.slice(0, 5)) {
        if (score.sceneTag && SCENE_EMOJIS[score.sceneTag]) {
            const options = SCENE_EMOJIS[score.sceneTag]!;
            emojis.push(options[Math.floor(Math.random() * options.length)]);
        }
    }

    // Remove duplicates and limit
    return [...new Set(emojis)].slice(0, 3).join('');
}

/**
 * Generate caption suggestions based on photo content
 */
export function generateCaptionSuggestions(
    scores: PhotoScore[],
    dumpType: 'weekly' | 'monthly' | 'trip' | 'yearly' | 'manual' = 'weekly',
    count: number = 5
): string[] {
    const suggestions: string[] = [];
    const vibe = detectDominantVibe(scores);
    const season = getCurrentSeason();
    const emojis = generateEmojis(scores);

    // Add type-specific captions
    if (dumpType === 'weekly') {
        const weeklyOptions = CAPTION_TEMPLATES.weekly;
        suggestions.push(weeklyOptions[Math.floor(Math.random() * weeklyOptions.length)]);
    } else if (dumpType === 'monthly') {
        const monthlyOptions = CAPTION_TEMPLATES.monthly;
        suggestions.push(monthlyOptions[Math.floor(Math.random() * monthlyOptions.length)]);
    }

    // Add activity-based caption
    if (CAPTION_TEMPLATES.activity[vibe as keyof typeof CAPTION_TEMPLATES.activity]) {
        const activityOptions = CAPTION_TEMPLATES.activity[vibe as keyof typeof CAPTION_TEMPLATES.activity];
        suggestions.push(activityOptions[Math.floor(Math.random() * activityOptions.length)]);
    }

    // Add seasonal caption
    const seasonalOptions = CAPTION_TEMPLATES.seasonal[season];
    suggestions.push(seasonalOptions[Math.floor(Math.random() * seasonalOptions.length)]);

    // Add general captions to fill up
    const generalOptions = [...CAPTION_TEMPLATES.general];
    while (suggestions.length < count) {
        const randomIndex = Math.floor(Math.random() * generalOptions.length);
        const caption = generalOptions.splice(randomIndex, 1)[0];
        if (!suggestions.includes(caption)) {
            suggestions.push(caption);
        }
        if (generalOptions.length === 0) break;
    }

    // Add emojis to some captions
    return suggestions.slice(0, count).map((caption, index) => {
        if (index === 0 && emojis && !caption.match(/[\u{1F300}-\u{1F9FF}]/u)) {
            return `${caption} ${emojis}`;
        }
        return caption;
    });
}

/**
 * Format caption with proper styling (lowercase, clean)
 */
export function formatCaption(caption: string): string {
    return caption.toLowerCase().trim();
}

/**
 * Get a single random caption
 */
export function getRandomCaption(scores?: PhotoScore[]): string {
    if (scores && scores.length > 0) {
        const suggestions = generateCaptionSuggestions(scores, 'weekly', 1);
        return formatCaption(suggestions[0]);
    }

    const general = CAPTION_TEMPLATES.general;
    return formatCaption(general[Math.floor(Math.random() * general.length)]);
}
