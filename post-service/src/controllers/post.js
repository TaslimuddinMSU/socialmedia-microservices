const Post = require('../models/post');
const logger = require('../utils/logger');
const { publishEvent } = require('../utils/rabbitmq');
const { validateCreatPost } = require('../utils/validation');

async function invalidatePostCache(req, input) {
    const cacheKey = `post: ${input}`;
    await req.redisClient.del(cacheKey);
    const keys = await req.redisClient.keys("posts:*");
    if (keys.length > 0) {
        await req.redisClient.del(keys)
    }
}

const createPosts = async (req, res) => {
    logger.warn("Hiting post request");
    try {
        const { error } = validateCreatPost(req.body);

        console.log("getting", error)
        if (error) {
            logger.warn("validation error", error.details[0].message);
            return res.status(400).json({
                success: false,
                message: error.details[0].message
            })
        }
        const { content, mediaIds } = req.body;
        const newPost = new Post({
            user: req.user.userId,
            content: content,
            mediaIds: mediaIds || []
        });

        await newPost.save();


        await publishEvent('post.created', {
            postId: newPost._id.toString(),
            userId: newPost.user.toString(),
            content: newPost.content,
            createdAt: newPost.createdAt,
        });


        
        await invalidatePostCache(req, newPost._id.toString());

        logger.info("Post created successfully")
        res.status(201).json({
            success: true,
            message: 'Post created successfully'
        })

    } catch (error) {
        logger.error("Error creating post:", error);
        res.status(500).json({
            success: false,
            message: "Error creating post",
        })
    }
}


const getAllPosts = async (req, res) => {
    try {

        const page = parseInt(req.query.page) || 1;
        const limit = parseInt(req.query.limit) || 10;
        const startIndex = (page - 1) * limit;

        const cacheKey = `posts: ${page}: ${limit}`;
        const cachePosts = await req.redisClient.get(cacheKey);
        if (cachePosts) {
            return res.json(JSON.parse(cachePosts));
        }

        const posts = await Post.find({})
            .sort({ createdAt: -1 })
            .skip(startIndex)
            .limit(limit);

        const totalNoOfPosts = await Post.countDocuments();
        const result = {
            posts,
            currentPage: page,
            totalPage: Math.ceil(totalNoOfPosts / limit),
            totalPosts: totalNoOfPosts
        };

        // save your posts in redis cache
        await req.redisClient.setex(cacheKey, 300, JSON.stringify(result));
        res.json(result)

    } catch (error) {
        logger.error("Error fetching posts:", error);
        res.status(500).json({
            success: false,
            message: "Error fetching posts",
        })
    }
}

const getPostById = async (req, res) => {
    try {
        const postId = req.params.id;
        const cacheKey = `post: ${postId}`;
        const cachePost = await req.redisClient.get(cacheKey);

        if (cachePost) {
            return res.json(JSON.parse(cachePost));
        }

        const postById = await Post.findById(postId);
        if (!postById) {
            res.status(400).json({
                success: false,
                message: "Post not found",
            })
        };

        await req.redisClient.setex(cachePost, 3600, JSON.stringify(postById));

        res.status(200).json({
            postById,
            success: true,
        })

    } catch (error) {
        logger.error("Error fetching post:", error);
        res.status(500).json({
            success: false,
            message: "Error fetching post by ID",
        })
    }
}

const deletePost = async (req, res) => {
    try {

        const post = await Post.findByIdAndDelete({
            _id: req.params.id,
            user: req.user.userId,
        });
        if (!post) {
            res.status(400).json({
                success: false,
                message: "Post not found",
            });
        };

        // Publishpost delete method
        await publishEvent('post.deleted', {
            postId: post._id.toString(),
            userId: req.user.userId,
            mediaIds: post.mediaIds
        })

        await invalidatePostCache(req, req.params.id)
        res.status(200).json({
            success: true,
            message: "Post deleted successfully",
        });

    } catch (error) {
        logger.error("Error deleting post:", error);
        res.status(500).json({
            success: false,
            message: "Error deleting post by ID",
        })
    }
};


module.exports = { createPosts, getAllPosts, getPostById, deletePost }