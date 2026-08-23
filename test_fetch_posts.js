require('dotenv').config();

async function testFetchPosts() {
    const fbToken = process.env.FB_ACCESS_TOKEN;
    const fbPageId = process.env.FB_PAGE_ID;
    
    // Facebook
    console.log('--- FACEBOOK ---');
    const fbUrl = `https://graph.facebook.com/v19.0/${fbPageId}/published_posts?fields=id,message,created_time,permalink_url,full_picture,shares,likes.summary(true),comments.summary(true)&limit=2&access_token=${fbToken}`;
    const fbRes = await fetch(fbUrl).then(r => r.json());
    console.log(JSON.stringify(fbRes.data, null, 2));

    // Instagram
    console.log('--- INSTAGRAM ---');
    const pageUrl = `https://graph.facebook.com/v19.0/${fbPageId}?fields=instagram_business_account&access_token=${fbToken}`;
    const pageRes = await fetch(pageUrl).then(r => r.json());
    if (pageRes.instagram_business_account) {
        const igId = pageRes.instagram_business_account.id;
        const igUrl = `https://graph.facebook.com/v19.0/${igId}/media?fields=id,caption,media_url,permalink,timestamp,like_count,comments_count,media_type&limit=2&access_token=${fbToken}`;
        const igRes = await fetch(igUrl).then(r => r.json());
        console.log(JSON.stringify(igRes.data, null, 2));
    }

    // YouTube
    console.log('--- YOUTUBE ---');
    const ytKey = process.env.YOUTUBE_API_KEY;
    const ytChannelId = process.env.YOUTUBE_CHANNEL_ID;
    const playlistId = ytChannelId.replace('UC', 'UU');
    const ytUrl = `https://www.googleapis.com/youtube/v3/playlistItems?part=snippet,contentDetails&playlistId=${playlistId}&maxResults=2&key=${ytKey}`;
    const ytRes = await fetch(ytUrl).then(r => r.json());
    if (ytRes.items) {
        const videoIds = ytRes.items.map(i => i.contentDetails.videoId).join(',');
        const ytStatsUrl = `https://www.googleapis.com/youtube/v3/videos?part=statistics&id=${videoIds}&key=${ytKey}`;
        const ytStatsRes = await fetch(ytStatsUrl).then(r => r.json());
        console.log(JSON.stringify(ytStatsRes.items, null, 2));
    }

    // TikTok
    console.log('--- TIKTOK ---');
    const tkKey = process.env.RAPIDAPI_KEY;
    const tkUsername = process.env.TIKTOK_USERNAME;
    const tkUrl = `https://tiktok-video-no-watermark2.p.rapidapi.com/user/posts?unique_id=${tkUsername}&count=2`;
    const tkRes = await fetch(tkUrl, { headers: { 'x-rapidapi-host': 'tiktok-video-no-watermark2.p.rapidapi.com', 'x-rapidapi-key': tkKey } }).then(r => r.json());
    if (tkRes.data && tkRes.data.videos) {
        console.log(JSON.stringify(tkRes.data.videos.slice(0, 2).map(v => ({ id: v.video_id, title: v.title, play_count: v.play_count, digg_count: v.digg_count, comment_count: v.comment_count })), null, 2));
    }
}
testFetchPosts();
