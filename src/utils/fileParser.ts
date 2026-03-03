export function extractTitleAndEpisode(filename: string): { seriesTitle: string; episodeNumber: number | null } {
    // basic implementation based on the old helper
    let seriesTitle = filename.replace(/\.mp4$/i, '').trim();
    let episodeNumber = null;

    const epMatch = seriesTitle.match(/(?:Ep|Episode|E)\s*(\d+)/i) || seriesTitle.match(/- (\d+)/);
    if (epMatch) {
        episodeNumber = parseInt(epMatch[1], 10);
        seriesTitle = seriesTitle.replace(epMatch[0], '').trim();
    }

    // clean up extra brackets
    seriesTitle = seriesTitle.replace(/\[.*?\]/g, '').trim();

    return {
        seriesTitle: seriesTitle || filename,
        episodeNumber,
    };
}

export function getBaseFilename(filename: string): string {
    const ext = filename.lastIndexOf('.');
    return ext > 0 ? filename.substring(0, ext) : filename;
}
