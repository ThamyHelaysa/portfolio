---
title: "Quick & Dirty Ngrok setup for mobile testing"
date: "2025-12-24"
updateDate: "2025-12-27"
description: "A fast, terminal-only Ngrok setup for testing on mobile (especially iOS). No .pkg files, no GUI, just pure tunnel energy. Also: Apple is still annoying."
tags: 
    - dev
    - ngrok
---

This was one of the first pieces of coworker wisdom I got in my career.
A fellow cow saw me struggling to test things on mobile — I was basically just staring at a convoluted mess, trying to check if a freaking link wasn’t showing up white anymore (of course, only on iOS).

He said: “Hey, I’ve got just the thing for you. It’s called ngrok—just do this and that and BAM! You can test your local environment without waiting around.”

It was a moment of pure joy. But after confirming the iOS bug was fixed and everything seemed normal, I kind of brushed it off. And just like that... I completely forgot about it.

But then I hit a problem (If you're curious: <a href="/blog/2025/fixing-waapi-csp-ios-safari/" rel="internal">check out this WAAPI CSP bug on iOS I found</a>). That’s when my brain snapped back and went: “Wait a minute. I know a good tool to test this.” A few sips of coffee later, here we are.


> **Note:** You can skip the early rambling and jump straight to [Steps](#steps) bellow. And shout-out to the fellow cow who helped me — yes, I meant coworker, but I’m keeping the typo because it feels right and now I imagine an actual cow in a hoodie helping me debug Safari 🐄.

<details>
  <summary>🐀 Terminal Rat Report</summary>
  <p>
    I didn’t download the <code>.pkg</code>. I didn’t click anything. I didn’t open a browser tab unless I absolutely had to.  
    I made a free ngrok account, threw my token into the CLI like a caveman with Wi-Fi, and boom—it worked.  
    <strong>Can I log into the dashboard? No. ngrok ghosted me. It’s fine. I’m in the tunnel now. There’s no going back.</strong>
  </p>
</details>

## WTF is ngrok?

So for those of you who dont know or just are confused to why this thing would be usefull I got you cover: [ngrok is the ultimate tool to a secure gateway for your applications](https://ngrok.com/docs/what-is-ngrok).

Dont get it? Lets get into this:

Imagine you have to go to the beach — your app or site is the beach 🏖️. A perfect destination: the sun, the waves, the sand stuck in every little crevice of your clothes (and also your dignity).
But getting there? Oh man, getting there means sitting in three hours of traffic just to set up your umbrella. The traffic is your deploy process: CI/CD pipelines, staging servers, configuration files, and other forms of spiritual violence.

Now imagine you remember a shortcut — a sneaky side road your uncle told you about during Christmas, <s>right after everyone had to pull him off the dinner table</s>.
This road doesn’t take you all the way to the beach, but it gets you close enough to smell the ocean and crack open a warm beer with your friends — without ever hitting traffic.

> **That’s ngrok**: a fast tunnel that gives people temporary access to your local project, even if it’s not quite ready to lay in the sun.

Now you know for what ngrok is for you can start to use it!

### Things of note

Unfortunatly I'm not a multi-plataform expert, I will show you steps that I made in mac and some I Think will work with windows and linux. I use Windows and Mac but most of my development happens in **Terminal Rat Mode™** on macOS. So… sorry in advance.

If you have any questions, feel free to reach out via LinkedIn or email — but honestly, you're probably well-served by the World Wide Web. Google (or Chat) awaits your next question. *Be curious.*

## Steps

First things first: I’m not going to set up a full server here. I’m assuming you already have your local dev environment running, and you just want to test it externally — especially on mobile.

I’m using Eleventy, which runs on port `8080` by default. But obviously, **use whatever port your setup uses**.

### Step 1 - Download

Let’s get into those juicy terminal commands so you can feel like a real hacker nerd.

#### For mac users - using homebrew

Get going with good'ol homebrew:

```
brew install ngrok
```

#### For windows users

Windows has a slightly more annoying way to get started:

You can install via the <a href="ms-windows-store://pdp/?ProductId=9mvs1j51gmk6" rel="noreferrer" target="_blank">Microsoft Store</a>

Or — if you're a properly versioned Terminal Rat™ and use <a href="https://community.chocolatey.org/packages/ngrok" rel="noreferrer" target="_blank">chocolatey</a> instead:

```
choco install ngrok
```

<blockquote class="warning-block block">
Note: I’m a lover of the internet and free choice, but I have to tell you: If you want to use a package manager, you need to be cautious about security and support.

Chocolatey is well trusted by many companies to manage packages on Windows. However, the ngrok package is maintained, moderated, and provided by the community — which means it’s not officially supported or guaranteed in any way.

Only proceed with this method if you're aware that it might come with extra headaches. I don’t recommend it for beginners.
</blockquote>

#### For linux users

Linux folks are so deeply nerdy they have five ways to do everything, so pick your thing:

Via apt

```
curl -sSL https://ngrok-agent.s3.amazonaws.com/ngrok.asc \
  | sudo tee /etc/apt/trusted.gpg.d/ngrok.asc >/dev/null \
  && echo "deb https://ngrok-agent.s3.amazonaws.com bookworm main" \
  | sudo tee /etc/apt/sources.list.d/ngrok.list \
  && sudo apt update \
  && sudo apt install ngrok
```

Or snap

```
snap install ngrok
```

Once it’s installed, the next step is to connect your user key so ngrok knows who you are.

### Step 2 - Connect account

To get your key, go to the <a href="https://dashboard.ngrok.com/signup" rel="noreferrer" target="_blank">ngrok dashboard</a> and either create an account or log in. Once logged in, look for your **Authtoken**. Copy it and run this command in your terminal. *You only have to do this once!*
```
ngrok config add-authtoken YOUR_TOKEN_HERE
```

You can check the connection with:

```
ngrok diagnose
```

Congrats, you’re now recognized by the tunnel. It's time to open the gate.


<details>
  <summary>Anonymous usage</summary>
  <p>
  If you don’t like creating an account on every random tool just to use it — we’re on the same page.
  But in this case, I wouldn’t worry too much. It’s a useful tool: you can log in with GitHub or Gmail and even delete your account afterward if you stop using it.<br/><br/> Still a problem for you? Well, bad news: <strong>you can’t use ngrok anonymously anymore</strong>! Yes, <a href="https://ngrok.com/docs/whats-new#december-2023" rel="noreferrer" target="_blank">ngrok removed the ability to use its tool anonymously after December 2023.</a>
  And for a good reason! As a PM at ngrok said: <a href="https://community.developer.atlassian.com/t/urgent-it-seems-ngrok-no-longer-allows-anonymous-access-forge-tunnel-is-broken/75910/5" rel="noreferrer" target="_blank">"We needed to remove anonymous access to our service as a mechanism to combat abuse of the platform"</a>.<br/><br/>
  You can check out other tools that don’t require account creation, like <a href="https://theboroer.github.io/localtunnel-www/" rel="noreferrer" target="_blank">localtunnel</a>, or <a href="https://developers.cloudflare.com/cloudflare-one/networks/connectors/cloudflare-tunnel/get-started/" rel="noreferrer" target="_blank">cloudflared</a> - if you use Cloudflare.
  </p>
</details>

### Step 3 - Start it

Since I built this site using Eleventy, my local server usually runs on port `8080`. So to share it with the world, I just run:

```
ngrok http 8080
```

{% imageContainer 
   "The terminal after you start ngrok.", 
   "ngrok-terminal.jpg", 
   null, 
   "The terminal after you start ngrok." 
%}

That `https://...ngrok-free.dev` URL is your golden ticket. Its a public HTTPS URL that tunnels directly to your local dev server. You can share it, use it as you like. Its the address of your tunnel. Every time someone or thing, send a request to this address it will be logged right after in the `Connections` tab.

> **Note**: Using a free account gives you one static domain that can be changed like my-cool-site.ngrok-free.dev, in the dashboard and keep it forever! Also note that you can only customize your domains (like dev.yourwebsite.com) in paid plans.

And that’s it. You are good to go and test your apps, APIs, webhooks, etc.

<blockquote class="error-block block">
Hey, be cautious! When you are done, shut it down. Go to your terminal and hit Ctrl + C. This kills the tunnel. Since the URL is public, you don't want to leave a door to your computer open when you aren't using it.
</blockquote>



<details>
  <summary>Common mistakes and issues</summary>

  - **You forgot to run your local server.** Make sure your server is actually running — ngrok doesn’t tunnel ghosts.
  - **You tunneled the wrong port.** Yeah, very basic. But it's a “been there, done that” moment. I feel you.
  - **You didn’t add your authtoken.** I literally told you to. You just didn’t listen.
  - **You’re behind a firewall.** Getting “reconnecting forever”? You might need to whitelist some domains:  
    - `connect.ngrok-agent.com` (for the tunnel)  
    - `crl.ngrok-agent.com` (for security checks)
  - **Your VPN is blocking the connection.** Super common on privacy-focused or corporate VPNs. Run `ngrok diagnose` to confirm. You don’t need to turn off your VPN — just look for “Split Tunneling” in the settings and add `ngrok` to the “Bypass VPN” list. That should do it.
  - **You closed your terminal.** Tunnel’s dead. If you really need to close it, <a href="https://ngrok.com/docs/agent#running-ngrok-in-the-background" rel="noreferrer" target="_blank"> run ngrok as a daemon in the background</a>.

  *Stay curious*
</details>

## Advanced tip

Thought that was it? No, you can make more things with ngrok. Did you know you can have multiple tunnels? 

#### Multiple tunnels

You can run multiple tunnels, but you cannot do it by just opening multiple terminal tabs (<a href="https://ngrok.com/docs/pricing-limits/free-plan-limits" rel="noreferrer" target="_blank">the free plan limits you to 1 active "agent" at a time</a>).

<details>
  <summary>Terminologies in ngrok</summary>
  <p>
  <ol>
  <li><strong>What is an "Agent"?</strong> The Agent is the actual program (software) running on your computer. When you type ngrok http 8080 in your terminal, you are starting an "ngrok agent" process.</li>
  <li><strong>What is a "Session"?</strong> A Session is the active connection between your local Agent and the ngrok Cloud servers. When your agent starts up, it logs in with your Authtoken and establishes a secure connection. That connection is the "session".</li>
  </ol>
  </p>
</details>

So the best way of doing this is editing the ngrok config file and defining multiple tunnels. First run:

```
ngrok config edit
```

This will open a YAML file so you can add your own config:

```
version: "2"
authtoken: YOUR_AUTH_TOKEN
tunnels:
  client-project:
    proto: http
    addr: 8080
  personal-blog:
    proto: http
    addr: 3000
```

Now, you can start specific ones by name:

```
ngrok start client-project
ngrok start personal-blog
```

Or try both (if your rich and have a paid plan):

```
ngrok start --all
```

## The End

And that’s it.

I re-discovered ngrok while cursing at iOS Safari — dug it out of the back of my brain like a forgotten USB stick, or maybe an old floppy — and it actually worked. No builds, no staging, no drama. Just a tunnel.

It was such a joy to see that cursed iOS bug finally disappear after hours of testing and stress.  
Now, every time I check the site on iOS, I can rest assured that, should anything go wrong, ngrok will lend me a hand. <s>More likely, a tunnel.</s>

But it also brought back memories of when I was just a girl, wandering the web and building stuff with my gang.

If you got this far: thanks for reading.  
I know it’s not a revolutionary tutorial, but it helped me and maybe it’ll help someone else screaming at a white screen on mobile. Thanks.

[**I was here.**](/copyrighty/)