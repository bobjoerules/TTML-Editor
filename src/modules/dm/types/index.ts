export interface DmTrackItem {
	id: number | string;
	title: string;
	artist: string;
	artistId?: number;
	album?: string;
	albumId?: number;
	duration: number;
	rank?: number;
	explicit?: boolean;
	cover?: string;
	deezerUrl?: string;
	downloadUrl?: string;
}

export interface DmSearchResponse {
	query?: string;
	type?: string;
	total?: number;
	data?: DmTrackItem[];
	source?: string;
	error?: string;
}

