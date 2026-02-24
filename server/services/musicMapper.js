// ═══════════════════════════════════════════════════════════════
// MUSIC MAPPER ENGINE — Multi-Axis Correlation Graph Builder
// ═══════════════════════════════════════════════════════════════
//
// The Music Mapper takes user "landmarks" (songs/artists) and builds
// a weighted correlation graph by fanning out across multiple axes:
//
//   1. BPM Proximity    — tempo-compatible tracks from our 90k DB
//   2. Genre Lineage    — scene/subgenre connections via tags
//   3. Temporal Cluster — era grouping via release year
//   4. Member Graph     — shared musicians across bands (Discogs credits)
//   5. Producer DNA     — same producer = same sonic fingerprint
//   6. Album Protocol   — full discography traversal per landmark
//
// Output: a weighted graph where nodes are artists/tracks and edges
// carry correlation type + strength. This graph feeds directly into
// agent-recon.js as intelligent target acquisition.
// ═══════════════════════════════════════════════════════════════

import fs from 'fs';
import path from 'path';
import { cache } from './cache.js';

const GRAPH_PATH = path.resolve(process.cwd(), 'server', 'data', 'mapper-graph.json');
const TRACKS_PATH = path.resolve(process.cwd(), 'server', 'data', 'tracks.json');
const DB_PATH = path.resolve(process.cwd(), 'server', 'data', 'db.json');

const sleep = ms => new Promise(r => setTimeout(r, ms));

// ─── Deezer API Helper ───────────────────────────────────────
async function deezerFetch(endpoint) {
    let retries = 3;
    while (retries > 0) {
        try {
            const res = await fetch(`https://api.deezer.com${endpoint}`);
            if (!res.ok) throw new Error(`HTTP ${res.status}`);
            const data = await res.json();
            if (data.error && data.error.code === 4) {
                console.log('   [Mapper/API Quota] Backing off 2s...');
                await sleep(2000);
                retries--;
                continue;
            }
            return data;
        } catch (err) {
            console.error(`   [Mapper/Error] ${err.message}`);
            await sleep(1500);
            retries--;
        }
    }
    return null;
}

// ─── Discogs API Helper (for member/producer credits) ────────
async function discogsFetch(endpoint) {
    const DISCOGS_TOKEN = process.env.DISCOGS_TOKEN || '';
    const headers = { 'User-Agent': 'BPM-GOD-MusicMapper/1.0' };
    if (DISCOGS_TOKEN) headers['Authorization'] = `Discogs token=${DISCOGS_TOKEN}`;

    let retries = 2;
    while (retries > 0) {
        try {
            const res = await fetch(`https://api.discogs.com${endpoint}`, { headers });
            if (res.status === 429) {
                const wait = parseInt(res.headers.get('retry-after') || '3');
                console.log(`   [Discogs/RateLimit] Waiting ${wait}s...`);
                await sleep(wait * 1000);
                retries--;
                continue;
            }
            if (!res.ok) throw new Error(`HTTP ${res.status}`);
            return await res.json();
        } catch (err) {
            console.error(`   [Discogs/Error] ${err.message}`);
            await sleep(2000);
            retries--;
        }
    }
    return null;
}

// ═══════════════════════════════════════════════════════════════
// GRAPH DATA STRUCTURE
// ═══════════════════════════════════════════════════════════════
//
// {
//   landmarks: [{ name, type: 'artist'|'track', addedAt, axes: {} }],
//   nodes: {
//     "artist::deftones": { type: 'artist', name, deezer_id, discogs_id, ... },
//     "track::deftones::my own summer": { type: 'track', bpm, year, ... }
//   },
//   edges: [
//     { from, to, axis: 'member'|'bpm'|'genre'|'era'|'producer', weight, meta }
//   ]
// }
// ═══════════════════════════════════════════════════════════════

function loadGraph() {
    if (fs.existsSync(GRAPH_PATH)) {
        return JSON.parse(fs.readFileSync(GRAPH_PATH, 'utf8'));
    }
    return { landmarks: [], nodes: {}, edges: [] };
}

function saveGraph(graph) {
    fs.writeFileSync(GRAPH_PATH, JSON.stringify(graph, null, 2));
}

function nodeKey(type, ...parts) {
    return `${type}::${parts.map(p => p.toLowerCase().trim()).join('::')}`;
}

function addNode(graph, key, data) {
    if (!graph.nodes[key]) {
        graph.nodes[key] = { ...data, connections: 0 };
    } else {
        Object.assign(graph.nodes[key], data);
    }
}

function addEdge(graph, from, to, axis, weight, meta = {}) {
    // Avoid duplicate edges on the same axis
    const exists = graph.edges.find(e =>
        e.from === from && e.to === to && e.axis === axis
    );
    if (exists) {
        exists.weight = Math.max(exists.weight, weight);
        return;
    }
    graph.edges.push({ from, to, axis, weight, meta, createdAt: new Date().toISOString() });

    // Increment connection counts
    if (graph.nodes[from]) graph.nodes[from].connections++;
    if (graph.nodes[to]) graph.nodes[to].connections++;
}

// ═══════════════════════════════════════════════════════════════
// AXIS 1: BPM PROXIMITY
// ═══════════════════════════════════════════════════════════════
// Given a landmark track's BPM, find all tracks within ±5 BPM in our
// offline database and create weighted edges (closer BPM = stronger edge)

function axisBpmProximity(graph, landmarkKey, landmarkBpm) {
    console.log(`   ⚡ Axis: BPM Proximity (±5 of ${landmarkBpm})`);

    let tracks = [];
    if (fs.existsSync(TRACKS_PATH)) {
        tracks = JSON.parse(fs.readFileSync(TRACKS_PATH, 'utf8'));
    }

    const matches = tracks.filter(t =>
        Math.abs(t.bpm - landmarkBpm) <= 5 && t.bpm > 0
    );

    // Take top 20 most popular or closest
    const sorted = matches
        .map(t => ({ ...t, distance: Math.abs(t.bpm - landmarkBpm) }))
        .sort((a, b) => a.distance - b.distance)
        .slice(0, 20);

    let count = 0;
    for (const t of sorted) {
        const trackKey = nodeKey('track', t.artist, t.title);
        addNode(graph, trackKey, {
            type: 'track', name: t.title, artist: t.artist,
            bpm: t.bpm, spotifyId: t.id || null
        });
        const weight = 1 - (Math.abs(t.bpm - landmarkBpm) / 6); // 1.0 = exact, ~0.17 = ±5
        addEdge(graph, landmarkKey, trackKey, 'bpm', weight, {
            landmarkBpm, matchBpm: t.bpm
        });
        count++;
    }
    console.log(`      → ${count} BPM-proximate nodes linked`);
}

// ═══════════════════════════════════════════════════════════════
// AXIS 2: RELATED ARTISTS (Deezer Graph Traversal)
// ═══════════════════════════════════════════════════════════════

async function axisRelatedArtists(graph, landmarkArtistKey, deezerArtistId) {
    console.log(`   🕸️ Axis: Related Artists (Deezer ID: ${deezerArtistId})`);

    const related = await deezerFetch(`/artist/${deezerArtistId}/related?limit=10`);
    if (!related?.data) return;

    let count = 0;
    for (const artist of related.data) {
        const artistKey = nodeKey('artist', artist.name);
        addNode(graph, artistKey, {
            type: 'artist', name: artist.name,
            deezerId: artist.id, picture: artist.picture_medium
        });
        addEdge(graph, landmarkArtistKey, artistKey, 'genre', 0.7, {
            source: 'deezer-related'
        });
        count++;
    }
    console.log(`      → ${count} related artist nodes linked`);
}

// ═══════════════════════════════════════════════════════════════
// AXIS 3: ALBUM PROTOCOL — Full Discography Traversal
// ═══════════════════════════════════════════════════════════════

async function axisAlbumProtocol(graph, landmarkArtistKey, deezerArtistId) {
    console.log(`   💿 Axis: Album Protocol (Full Discography Scan)`);

    const albums = await deezerFetch(`/artist/${deezerArtistId}/albums?limit=20`);
    if (!albums?.data) return;

    let count = 0;
    for (const album of albums.data) {
        const albumKey = nodeKey('album', album.title, String(album.id));
        const year = album.release_date ? parseInt(album.release_date.split('-')[0]) : null;

        addNode(graph, albumKey, {
            type: 'album', name: album.title, artist: landmarkArtistKey,
            deezerId: album.id, year, cover: album.cover_medium
        });
        addEdge(graph, landmarkArtistKey, albumKey, 'discography', 0.9, { year });

        // Optionally fetch tracks for each album
        const albumTracks = await deezerFetch(`/album/${album.id}/tracks?limit=50`);
        if (albumTracks?.data) {
            for (const t of albumTracks.data) {
                const trackKey = nodeKey('track', t.artist?.name || '', t.title);
                addNode(graph, trackKey, {
                    type: 'track', name: t.title, artist: t.artist?.name || '',
                    duration: t.duration, album: album.title, year
                });
                addEdge(graph, albumKey, trackKey, 'discography', 0.8);
                count++;
            }
        }
        await sleep(250);
    }
    console.log(`      → ${count} album track nodes mapped`);
}

// ═══════════════════════════════════════════════════════════════
// AXIS 4: MEMBER GRAPH — Shared Musicians (Discogs Credits)
// ═══════════════════════════════════════════════════════════════
// The Deep Dive Protocol: find band members via Discogs, then find
// ALL other bands those members played in.

async function axisMemberGraph(graph, landmarkArtistKey, artistName) {
    console.log(`   🧬 Axis: Member Graph (Deep Dive Protocol)`);

    // Step 1: Search Discogs for the artist
    const search = await discogsFetch(`/database/search?q=${encodeURIComponent(artistName)}&type=artist&per_page=3`);
    if (!search?.results?.length) {
        console.log(`      ⚠️ Artist not found on Discogs`);
        return;
    }

    const discogsArtistId = search.results[0].id;
    const discogsArtistUrl = `/artists/${discogsArtistId}`;

    // Step 2: Fetch the artist profile to get member list
    const artistProfile = await discogsFetch(discogsArtistUrl);
    if (!artistProfile) return;
    await sleep(1200);

    const members = artistProfile.members || [];
    if (members.length === 0) {
        console.log(`      ℹ️ No member data available (may be a solo artist)`);

        // For solo artists, check "groups" field
        const groups = artistProfile.groups || [];
        if (groups.length > 0) {
            console.log(`      🔗 Found ${groups.length} group affiliations`);
            for (const group of groups.slice(0, 8)) {
                const groupKey = nodeKey('artist', group.name);
                addNode(graph, groupKey, {
                    type: 'artist', name: group.name,
                    discogsId: group.id, source: 'discogs-group'
                });
                addEdge(graph, landmarkArtistKey, groupKey, 'member', 0.95, {
                    relationship: 'group-affiliation',
                    memberName: artistName
                });
            }
        }
        return;
    }

    console.log(`      👥 Found ${members.length} members`);

    // Step 3: For each member, find their other bands
    let totalConnections = 0;
    for (const member of members.slice(0, 10)) {
        const memberKey = nodeKey('person', member.name);
        addNode(graph, memberKey, {
            type: 'person', name: member.name,
            discogsId: member.id, active: member.active !== false
        });
        addEdge(graph, landmarkArtistKey, memberKey, 'member', 1.0, {
            role: 'current-member'
        });

        // Fetch the member's profile to find their OTHER groups
        await sleep(1200);
        const memberProfile = await discogsFetch(`/artists/${member.id}`);
        if (!memberProfile) continue;

        const otherGroups = memberProfile.groups || [];
        for (const group of otherGroups.slice(0, 6)) {
            if (group.name.toLowerCase() === artistName.toLowerCase()) continue;

            const groupKey = nodeKey('artist', group.name);
            addNode(graph, groupKey, {
                type: 'artist', name: group.name,
                discogsId: group.id, source: 'discogs-member-group'
            });

            // Member → Group edge
            addEdge(graph, memberKey, groupKey, 'member', 0.9, {
                relationship: 'also-in',
                memberName: member.name
            });

            // Landmark ← → Group (transitive connection through shared member)
            addEdge(graph, landmarkArtistKey, groupKey, 'member', 0.75, {
                relationship: 'shared-member',
                via: member.name
            });
            totalConnections++;
        }
    }
    console.log(`      → ${totalConnections} cross-band member connections discovered`);
}

// ═══════════════════════════════════════════════════════════════
// AXIS 5: TEMPORAL CLUSTERING — Era Correlation
// ═══════════════════════════════════════════════════════════════

function axisTemporalCluster(graph, landmarkKey, year) {
    if (!year) return;
    console.log(`   📅 Axis: Temporal Cluster (Year: ${year}, ±2yr window)`);

    // Find all existing nodes within ±2 years
    let count = 0;
    for (const [key, node] of Object.entries(graph.nodes)) {
        if (key === landmarkKey) continue;
        if (node.year && Math.abs(node.year - year) <= 2) {
            addEdge(graph, landmarkKey, key, 'era', 0.6, {
                landmarkYear: year, matchYear: node.year
            });
            count++;
        }
    }
    console.log(`      → ${count} temporal connections linked`);
}

// ═══════════════════════════════════════════════════════════════
// MASTER EXPLORE FUNCTION
// ═══════════════════════════════════════════════════════════════

export async function exploreLandmark(artistName, trackTitle = null, options = {}) {
    const graph = loadGraph();
    const {
        axes = ['bpm', 'related', 'albums', 'members', 'era'],
        depth = 1
    } = options;

    console.log(`\n🗺️  MUSIC MAPPER: Exploring Landmark → "${artistName}" ${trackTitle ? `"${trackTitle}"` : ''}`);
    console.log(`   Axes: [${axes.join(', ')}]  Depth: ${depth}`);

    // ─── Resolve the Artist via Deezer ───────────────────────
    const searchData = await deezerFetch(`/search/artist?q=${encodeURIComponent(artistName)}&limit=1`);
    const deezerArtist = searchData?.data?.[0];

    if (!deezerArtist) {
        console.log(`   ❌ Could not find "${artistName}" on Deezer`);
        return { error: 'Artist not found', graph };
    }

    const artistKey = nodeKey('artist', deezerArtist.name);
    addNode(graph, artistKey, {
        type: 'artist', name: deezerArtist.name,
        deezerId: deezerArtist.id, picture: deezerArtist.picture_medium,
        isLandmark: true
    });

    // Register as landmark
    if (!graph.landmarks.find(l => l.name.toLowerCase() === deezerArtist.name.toLowerCase())) {
        graph.landmarks.push({
            name: deezerArtist.name,
            type: trackTitle ? 'track' : 'artist',
            addedAt: new Date().toISOString()
        });
    }

    // ─── Resolve the Track (if provided) ─────────────────────
    let trackKey = null;
    let trackBpm = null;
    let trackYear = null;

    if (trackTitle) {
        const trackSearch = await deezerFetch(
            `/search/track?q=${encodeURIComponent(`${trackTitle} ${artistName}`)}&limit=1`
        );
        const deezerTrack = trackSearch?.data?.[0];

        if (deezerTrack) {
            trackKey = nodeKey('track', deezerArtist.name, deezerTrack.title);

            // Try to get BPM from offline DB
            let offlineTracks = [];
            if (fs.existsSync(TRACKS_PATH)) {
                offlineTracks = JSON.parse(fs.readFileSync(TRACKS_PATH, 'utf8'));
            }
            const offlineMatch = offlineTracks.find(t =>
                t.title.toLowerCase().includes(trackTitle.toLowerCase()) &&
                t.artist.toLowerCase().includes(artistName.toLowerCase())
            );

            trackBpm = offlineMatch?.bpm || null;
            trackYear = deezerTrack.album?.release_date
                ? parseInt(deezerTrack.album.release_date.split('-')[0])
                : null;

            addNode(graph, trackKey, {
                type: 'track', name: deezerTrack.title,
                artist: deezerArtist.name, bpm: trackBpm,
                year: trackYear, isLandmark: true,
                album: deezerTrack.album?.title,
                cover: deezerTrack.album?.cover_medium
            });
            addEdge(graph, artistKey, trackKey, 'discography', 1.0);
        }
    }

    // ─── Execute Requested Axes ──────────────────────────────
    const anchorKey = trackKey || artistKey;

    if (axes.includes('bpm') && trackBpm) {
        axisBpmProximity(graph, anchorKey, trackBpm);
    }

    if (axes.includes('related')) {
        await axisRelatedArtists(graph, artistKey, deezerArtist.id);
    }

    if (axes.includes('albums')) {
        await axisAlbumProtocol(graph, artistKey, deezerArtist.id);
    }

    if (axes.includes('members')) {
        await axisMemberGraph(graph, artistKey, deezerArtist.name);
    }

    if (axes.includes('era') && trackYear) {
        axisTemporalCluster(graph, anchorKey, trackYear);
    }

    // ─── Persist ─────────────────────────────────────────────
    saveGraph(graph);

    const stats = {
        totalNodes: Object.keys(graph.nodes).length,
        totalEdges: graph.edges.length,
        totalLandmarks: graph.landmarks.length,
        axesCovered: axes
    };

    console.log(`\n🗺️  MAPPER COMPLETE:`);
    console.log(`   📍 Landmarks: ${stats.totalLandmarks}`);
    console.log(`   🔵 Nodes: ${stats.totalNodes}`);
    console.log(`   🔗 Edges: ${stats.totalEdges}`);

    return { stats, graph };
}

// ═══════════════════════════════════════════════════════════════
// QUERY FUNCTIONS — Read the graph
// ═══════════════════════════════════════════════════════════════

export function getGraph() {
    return loadGraph();
}

export function getConstellationFor(artistName) {
    const graph = loadGraph();
    const key = nodeKey('artist', artistName);

    if (!graph.nodes[key]) return null;

    // Find all edges touching this artist
    const edges = graph.edges.filter(e => e.from === key || e.to === key);

    // Collect connected nodes
    const connectedKeys = new Set();
    edges.forEach(e => {
        connectedKeys.add(e.from === key ? e.to : e.from);
    });

    const nodes = {};
    nodes[key] = graph.nodes[key];
    for (const ck of connectedKeys) {
        if (graph.nodes[ck]) nodes[ck] = graph.nodes[ck];
    }

    return { center: key, nodes, edges };
}

export function getLandmarks() {
    const graph = loadGraph();
    return graph.landmarks;
}

export function getGraphStats() {
    const graph = loadGraph();
    const edgesByAxis = {};
    graph.edges.forEach(e => {
        edgesByAxis[e.axis] = (edgesByAxis[e.axis] || 0) + 1;
    });

    return {
        landmarks: graph.landmarks.length,
        nodes: Object.keys(graph.nodes).length,
        edges: graph.edges.length,
        edgesByAxis,
        nodeTypes: {
            artists: Object.values(graph.nodes).filter(n => n.type === 'artist').length,
            tracks: Object.values(graph.nodes).filter(n => n.type === 'track').length,
            albums: Object.values(graph.nodes).filter(n => n.type === 'album').length,
            people: Object.values(graph.nodes).filter(n => n.type === 'person').length,
        }
    };
}

// ═══════════════════════════════════════════════════════════════
// GAP DETECTION — Find artist nodes that lack BPM database tracks
// ═══════════════════════════════════════════════════════════════

export function getGaps() {
    const graph = loadGraph();

    // Load both databases
    let massiveTracks = [];
    let dbTracks = [];
    if (fs.existsSync(TRACKS_PATH)) massiveTracks = JSON.parse(fs.readFileSync(TRACKS_PATH, 'utf8'));
    if (fs.existsSync(DB_PATH)) dbTracks = JSON.parse(fs.readFileSync(DB_PATH, 'utf8'));

    // Build a set of artist names we DO have in our BPM pool
    const knownArtists = new Set();
    massiveTracks.forEach(t => knownArtists.add(t.artist.toLowerCase().trim()));
    dbTracks.forEach(t => knownArtists.add(t.artist.toLowerCase().trim()));

    // Find artist nodes that have ZERO tracks in our databases
    const gaps = [];
    const mapped = [];

    for (const [key, node] of Object.entries(graph.nodes)) {
        if (node.type !== 'artist') continue;

        const artistLower = (node.name || '').toLowerCase().trim();
        if (!artistLower) continue;

        const status = knownArtists.has(artistLower) ? 'mapped' : 'unmapped';

        // Tag the node in the graph so the frontend can render it
        node.mapStatus = status;

        const entry = {
            key,
            name: node.name,
            isLandmark: !!node.isLandmark,
            connections: node.connections || 0,
            deezerId: node.deezerId || null,
            status
        };

        if (status === 'unmapped') gaps.push(entry);
        else mapped.push(entry);
    }

    // Save updated map status back
    saveGraph(graph);

    return {
        totalArtists: gaps.length + mapped.length,
        unmapped: gaps.length,
        mapped: mapped.length,
        gaps: gaps.sort((a, b) => b.connections - a.connections),
        mappedArtists: mapped.sort((a, b) => b.connections - a.connections)
    };
}
