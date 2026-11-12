export interface JooxSongItem {
	序号: number;
	歌曲名称: string;
	歌手: string;
	专辑: string;
	时长: string;
	歌曲ID: string;
	songmid: string;
}

export interface JooxSongDetail {
	歌曲名称: string;
	歌手: string;
	专辑: string;
	时长: string;
	歌曲ID: string;
	songmid: string;
	歌词状态?: string;
	歌词内容?: string;
	播放链接?: Record<string, string>;
}

export interface JooxTrack {
	id: string;
	index: number;
	name: string;
	artist: string;
	album?: string;
	cover?: string;
	duration?: string;
	songmid?: string;
	lyrics?: string;
	audioUrls?: Record<string, string>;
	source?: string;
	downloadUrl?: string;
	rank?: number;
}
