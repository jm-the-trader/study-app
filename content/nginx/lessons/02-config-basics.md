# Nginx Configuration Basics

Nginx is configured by editing text files, then reloading. Once you understand the *shape* of the config, everything else is just filling in blocks. This lesson gives you that mental model.

## The config file's structure

Config is built from **directives** and **blocks (contexts)**.

- A **simple directive** is a name, some arguments, and a semicolon: `worker_processes auto;`
- A **block directive** groups other directives inside `{ }` and defines a **context**: `http { … }`

Contexts nest, and they inherit: settings in an outer context apply to inner ones unless overridden. The hierarchy:

```nginx
# main context (the file itself)
worker_processes auto;

events {                      # connection-handling settings
    worker_connections 1024;
}

http {                        # everything HTTP lives here
    include       mime.types;
    default_type  application/octet-stream;
    sendfile      on;

    server {                  # one virtual host
        listen      80;
        server_name example.com;

        location / {          # rules for a set of URLs
            root /var/www/example;
            index index.html;
        }
    }
}
```

> 🔑 Memorize this nesting: **main → events / http → server → location.** Ninety percent of your work happens in `server` and `location` blocks.

## The four contexts you'll actually edit

| Context | Holds | Think of it as… |
|---|---|---|
| **main** | global settings (worker count, user, error log) | the engine settings |
| **http** | all HTTP behavior, defaults shared by all sites | the building |
| **server** | one virtual host (a site/domain on a port) | a floor / tenant |
| **location** | rules for URLs matching a pattern | a room with its own rules |

## Where the files live

Distros split config into includable pieces so you can manage one site per file:

```
/etc/nginx/
├── nginx.conf                 # the main file; includes the others
├── conf.d/*.conf              # often auto-included
├── sites-available/           # one file per site (Debian/Ubuntu convention)
│   └── example.com
└── sites-enabled/             # symlinks to the sites you've turned ON
    └── example.com -> ../sites-available/example.com
```

The `nginx.conf` typically ends with `include /etc/nginx/sites-enabled/*;`. To enable a site you symlink it from `sites-available` into `sites-enabled`; to disable, remove the symlink. (The `conf.d/*.conf` style is also common — both are just `include` patterns.)

## server_name and the `listen` directive

A `server` block claims requests based on **port** (`listen`) and **host** (`server_name`):

```nginx
server {
    listen 80;
    server_name example.com www.example.com;   # matches these Host headers
    # ...
}
```

When multiple `server` blocks listen on the same port, Nginx picks the one whose `server_name` matches the request's `Host` header. The block marked `default_server` (or the first one) handles anything that doesn't match.

## location matching — the part worth slowing down for

`location` decides which block handles a URL. The modifier in front controls *how* it matches, and there's a precedence order that surprises people:

```nginx
location = /exact      { }   # 1. EXACT match only — highest priority
location ^~ /assets/   { }   # 2. prefix match; if it wins, stop (skip regex)
location ~ \.php$      { }   # 3. case-sensitive REGEX
location ~* \.(jpg|png)$ { } # 3. case-INsensitive regex (~* )
location /             { }   # 4. plain prefix; longest match wins
```

**Resolution order:**
1. An `=` exact match wins immediately.
2. Otherwise Nginx remembers the **longest** matching prefix. If that prefix used `^~`, it stops there.
3. Otherwise it tries **regex** locations in file order; the **first** matching regex wins.
4. If no regex matches, the longest prefix from step 2 is used.

> ⚠️ Two classic gotchas: (a) **the first matching regex wins**, so order your regex blocks carefully; (b) longest-*prefix* beats shorter prefix, but a matching *regex* normally beats a prefix — use `^~` to protect a prefix (like `/assets/`) from regex rules.

## root vs. alias (a perennial source of 404s)

Both map a URL to the filesystem, but differently:

```nginx
location /images/ {
    root /var/www/data;     # request /images/cat.png → /var/www/data/images/cat.png
}                           #   (root APPENDS the full URI path)

location /images/ {
    alias /var/www/pics/;   # request /images/cat.png → /var/www/pics/cat.png
}                           #   (alias REPLACES the matched location prefix)
```

> 💡 Rule: **`root` appends the whole URI; `alias` replaces the matched part.** Mixing them up is the most common static-file 404. With `alias`, keep the trailing slashes consistent.

## The workflow: edit → test → reload

**Never reload a config you haven't tested.** A syntax error can take your site down.

```bash
sudo nginx -t          # test config syntax & validity ("test")
# → syntax is ok / test is successful

sudo nginx -s reload   # graceful reload: zero downtime (Lesson 1)
# or: sudo systemctl reload nginx
```

`nginx -t` parses the *entire* config and reports the file and line of any error. Make `-t` then `reload` a reflex — two commands, always in that order.

## Reading logs

```nginx
http {
    access_log /var/log/nginx/access.log;   # every request
    error_log  /var/log/nginx/error.log warn;  # problems
}
```

When something's broken, `tail -f /var/log/nginx/error.log` while you reproduce the request is the fastest path to the cause.

## Check yourself

1. List the context hierarchy from outermost to a URL rule.
2. Request is `/assets/app.js`. You have both `location ^~ /assets/` and `location ~* \.js$`. Which wins, and why?
3. With `location /static/ { alias /srv/files/; }`, what file does `/static/logo.png` map to? What if you'd used `root` instead?

## Key takeaways

- Config = **directives** + nested **blocks (contexts)**: **main → events/http → server → location**.
- `listen` + `server_name` route a request to a **server** block; **location** modifiers (`=`, `^~`, `~`, `~*`, prefix) decide the URL handler with a specific precedence — and **the first matching regex wins**.
- **`root` appends** the URI; **`alias` replaces** the matched prefix — the top cause of static-file 404s.
- Always **`nginx -t` then `nginx -s reload`** — test before you reload.
