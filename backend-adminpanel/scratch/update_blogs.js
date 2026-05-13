const db = require('../src/config/database');

const content = `
<p>Google has been investing in AI for many years and bringing its benefits to individuals, businesses and communities. Whether it’s publishing state-of-the-art research, building helpful products or developing tools and resources that enable others, we’re committed to making AI accessible to everyone.</p>

<p>We’re now at a pivotal moment in our AI journey. Breakthroughs in generative AI are fundamentally changing how people interact with technology — and at Google, we’ve been responsibly developing large language models so we can safely bring them to our products. Today, we’re excited to share our early progress. Developers and businesses can now try new APIs and products that make it easy, safe and scalable to start building with Google’s best AI models through Google Cloud and a new prototyping environment called MakerSuite. And in Google Workspace, we’re introducing new features that help people harness the power of generative AI to create, connect and collaborate.</p>

<blockquote style="border-left: 5px solid #F34100; padding-left: 20px; margin: 40px 0; font-style: italic;">
“People worry that computers will get too smart and take over the world, but the real problem is that they’re too stupid and they’ve already taken over the world.”
<cite style="display: block; font-weight: 600; margin-top: 10px; font-style: normal;">– Pedro Domingos</cite>
</blockquote>

<p>More than 3 billion people already benefit from AI-powered features in Google Workspace, whether it’s using Smart Compose in Gmail or auto-generated summaries in Google Docs. Now, we’re excited to take the next step and bring a limited set of trusted testers a new set of features that makes the process of writing even easier. In Gmail and Google Docs, you can simply type in a topic you’d like to write about, and a draft will be instantly generated for you. So if you’re a manager onboarding a new employee, Workspace saves you the time and effort involved in writing that first welcome email. From there, you can elaborate upon or abbreviate the message or adjust the tone to be more playful or professional — all in just a few clicks. We’ll be rolling out these new experiences to testers in the coming weeks.</p>

<p>We’re so excited by the potential of generative AI, and the opportunities it will unlock — from helping people express themselves creatively, to helping developers build brand new types of applications, to transforming how businesses and governments engage their customers and constituents. Stay tuned for more to come in the weeks and months ahead.</p>
`;

const subtitle = 'From intimate ceremonies to grand celebrations, find the saree that captures the essence of your special day.';

async function run() {
    try {
        await db.query('UPDATE blogs SET content = ?, subtitle = ? WHERE id > 1', [content, subtitle]);
        console.log('Blogs updated successfully');
    } catch (err) {
        console.error('Update failed:', err);
    } finally {
        process.exit();
    }
}

run();
