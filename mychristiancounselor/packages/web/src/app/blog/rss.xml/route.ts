import { getAllBlogPosts } from '../../../lib/blog-posts';

export async function GET() {
  const posts = getAllBlogPosts();
  const baseUrl = 'https://www.mychristiancounselor.online';

  const rss = `<?xml version="1.0" encoding="UTF-8"?>
<rss version="2.0"
     xmlns:atom="http://www.w3.org/2005/Atom"
     xmlns:content="http://purl.org/rss/1.0/modules/content/">
  <channel>
    <title>MyChristianCounselor Blog - Christian Counseling &amp; Biblical Guidance</title>
    <link>${baseUrl}/blog</link>
    <description>Biblical guidance for mental health, relationships, and faith-based living. Scripture-based wisdom for life's challenges.</description>
    <language>en-us</language>
    <lastBuildDate>${new Date().toUTCString()}</lastBuildDate>
    <atom:link href="${baseUrl}/blog/rss.xml" rel="self" type="application/rss+xml"/>
    <image>
      <url>${baseUrl}/logo.jpg</url>
      <title>MyChristianCounselor</title>
      <link>${baseUrl}/blog</link>
    </image>
    ${posts
      .map(
        (post) => `
    <item>
      <title><![CDATA[${post.title}]]></title>
      <link>${baseUrl}/blog/${post.slug}</link>
      <guid isPermaLink="true">${baseUrl}/blog/${post.slug}</guid>
      <description><![CDATA[${post.excerpt}]]></description>
      <pubDate>${new Date(post.publishedDate).toUTCString()}</pubDate>
      <author>noreply@mychristiancounselor.online (${post.author})</author>
      <category>${post.category}</category>
      ${post.tags.map((tag) => `<category>${tag}</category>`).join('\n      ')}
      <content:encoded><![CDATA[
        ${post.content}
        <p><a href="${baseUrl}/blog/${post.slug}">Read more on MyChristianCounselor</a></p>
      ]]></content:encoded>
    </item>`
      )
      .join('\n')}
  </channel>
</rss>`;

  return new Response(rss, {
    headers: {
      'Content-Type': 'application/xml; charset=utf-8',
      'Cache-Control': 'public, max-age=3600, s-maxage=3600',
    },
  });
}
