# WordPress MCP Server

This is a Model Context Protocol (MCP) server that provides tools for interacting with a WordPress site's admin functionality. It allows you to programmatically manage WordPress content through the MCP protocol.

## Features

- Fetch posts, pages, and custom post types
- Create and update posts
- Delete posts
- Upload media
- Manage categories and tags
- Work with custom fields (via ACF)

## Prerequisites

- Node.js 14.x or higher
- A WordPress installation with the following plugins:
  - JWT Authentication for WP REST API (for secure authentication)
  - Advanced Custom Fields (ACF) (optional, for custom fields)
  - ACF to REST API (optional, for exposing custom fields to the API)

## Setup

1. Clone this repository:
   ```bash
   git clone <repository-url>
   cd wordpress-mcp-server
   ```

2. Install dependencies:
   ```bash
   npm install
   ```

3. Create a `.env` file based on the example:
   ```bash
   cp .env.example .env
   ```

4. Edit the `.env` file with your WordPress credentials:
   ```
   WP_BASE_URL=http://your-wordpress-site.local/wp-json
   WP_USERNAME=your_admin_username
   WP_PASSWORD=your_admin_password
   ```

5. Build the server:
   ```bash
   npm run build
   ```

## WordPress Configuration

1. Install and activate the JWT Authentication for WP REST API plugin
2. Add the following to your WordPress site's `.htaccess` file:
   ```
   RewriteEngine on
   RewriteCond %{HTTP:Authorization} ^(.*)
   RewriteRule ^(.*) - [E=HTTP_AUTHORIZATION:%1]
   ```

3. Add the following to your `wp-config.php` file:
   ```php
   define('JWT_AUTH_SECRET_KEY', 'your-secret-key');
   define('JWT_AUTH_CORS_ENABLE', true);
   ```

## Using with Cline

To use this MCP server with Cline, add it to your Cline MCP settings file:

1. Open the Cline MCP settings file:
   - macOS: `~/Library/Application Support/Code/User/globalStorage/rooveterinaryinc.roo-cline/settings/cline_mcp_settings.json`
   - Windows: `%APPDATA%\Code\User\globalStorage\rooveterinaryinc.roo-cline\settings\cline_mcp_settings.json`
   - Linux: `~/.config/Code/User/globalStorage/rooveterinaryinc.roo-cline/settings/cline_mcp_settings.json`

2. Add the WordPress MCP server configuration:
   ```json
   {
     "mcpServers": {
       "wordpress": {
         "command": "node",
         "args": ["/Users/kinglerbercy/Documents/Cline/MCP/wordpress-mcp-server/build/index.js"],
         "env": {
           "WP_BASE_URL": "http://your-wordpress-site.local/wp-json",
           "WP_USERNAME": "your_admin_username",
           "WP_PASSWORD": "your_admin_password"
         },
         "disabled": false,
         "alwaysAllow": []
       }
     }
   }
   ```

3. Restart Cline to load the new MCP server

## Available Tools

Once connected, the WordPress MCP server provides the following tools:

- `wp_get_posts`: Get posts from WordPress
- `wp_get_post`: Get a post by ID
- `wp_create_post`: Create a new post
- `wp_update_post`: Update an existing post
- `wp_delete_post`: Delete a post
- `wp_get_pages`: Get pages from WordPress
- `wp_get_custom_post_types`: Get custom post types
- `wp_get_custom_post_type_items`: Get items of a custom post type
- `wp_upload_media`: Upload media to WordPress
- `wp_get_media`: Get media from WordPress
- `wp_get_categories`: Get categories from WordPress
- `wp_get_tags`: Get tags from WordPress
- `wp_create_category`: Create a new category
- `wp_create_tag`: Create a new tag

## Example Usage

Here's an example of how to use the WordPress MCP server with Cline:

```
I want to create a new blog post in WordPress with the title "Hello World" and the content "This is my first post."
```

Cline will use the `wp_create_post` tool to create the post in WordPress.

## Development

To run the server in development mode:

```bash
npm run dev
```

## License

MIT