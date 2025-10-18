import Category from '../../models/astrologerCategory.model.js'
import { asyncHandler } from '../../utils/asyncHandler.js';
import { ApiResponse } from '../../utils/apiResponse.js';
import { Astrologer } from '../../models/astrologer.model.js';
import { AI_Astrologer } from '../../models/ai_astrologer_model.js';

// Controller function to add a category
export const addCategory = asyncHandler(async (req, res) => {
    try {
        let { name } = req.body;

        // Capitalize the first letter of the name if it exists
        if (name && name.length > 0) {
            name = name.charAt(0).toUpperCase() + name.slice(1);
        }


        // Check if the category already exists
        const existingCategory = await Category.findOne({ name });
        if (existingCategory) {
            return res.status(400).json(new ApiResponse(400, null, "Category already exists."));
        }

        // Create a new category
        const newCategory = new Category({ name });
        await newCategory.save();
        return res.status(201).json(new ApiResponse(400, newCategory, "Category added successfully"));
    } catch (error) {
        console.error(error);
        return res.status(500).json(new ApiResponse(400, null, "Server error while adding category."));
    }
})

// Controller function to delete a category
// Controller to delete a category (only if it has no astrologers)
export const deleteCategory = asyncHandler(async (req, res) => {
    try {
        const { categoryId } = req.params; // Get category ID from route parameters

        // Find the category by ID
        const category = await Category.findById(categoryId);
        if (!category) {
            return res.status(400).json(new ApiResponse(400, null, "Category not found."));
        }

        // Check if the category has astrologers
        if (category.astrologers.length > 0) {
            return res.status(400).json(new ApiResponse(400, null, "Category cannot be deleted because it has astrologers."));
        }

        // Delete the category
        await Category.findByIdAndDelete(categoryId);

        // Return success response
        return res.status(200).json(new ApiResponse(200, null, "Category deleted successfully."));
    } catch (error) {
        console.error(error);
        return res.status(500).json(new ApiResponse(500, null, "Server error while deleting category."));
    }
});


export const addAstrologerToCategory = asyncHandler(async (req, res) => {
    const { categoryId, astrologerId } = req.body; // Get categoryId and astrologerId from the request body

    try {
        // Find the category by its ID
        const category = await Category.findById(categoryId);
        if (!category) {
            return res.status(400).json(new ApiResponse(400, null, "Category not found."));
        }

        // Optionally, check if the astrologer exists
        const astrologer = await Astrologer.findById(astrologerId);
        if (!astrologer) {
            return res.status(400).json(new ApiResponse(400, null, "Astrologer not found."));
        }

        // Check if the astrologer is already in the category's astrologers list
        if (category.astrologers.includes(astrologerId)) {
            return res.status(400).json(new ApiResponse(400, null, "Astrologer is already added to this category."));
        }

        // Add astrologer's ID to the astrologers array of the category
        category.astrologers.push(astrologerId);

        // Save the updated category
        await category.save();

        // Return success response
        return res.status(200).json(new ApiResponse(200, category, "Astrologer added to the category successfully."));
    } catch (error) {
        console.error(error);
        return res.status(500).json(new ApiResponse(500, null, "Server error while adding astrologer to category."));
    }
});

// Controller to delete an astrologer from a category
export const deleteAstrologerFromCategory = asyncHandler(async (req, res) => {
    const { categoryId, astrologerId } = req.body; // Get categoryId and astrologerId from the request body

    try {
        // Find the category by its ID
        const category = await Category.findById(categoryId);
        if (!category) {
            return res.status(400).json(new ApiResponse(400, null, "Category not found."));
        }

        // Check if the astrologer is in the category's astrologers list
        if (!category.astrologers.includes(astrologerId)) {
            return res.status(400).json(new ApiResponse(400, null, "Astrologer not found in this category."));
        }

        // Remove astrologer's ID from the astrologers array
        category.astrologers = category.astrologers.filter(id => id.toString() !== astrologerId);

        // Save the updated category
        await category.save();

        // Return success response
        return res.status(200).json(new ApiResponse(200, category, "Astrologer removed from the category successfully."));
    } catch (error) {
        console.error(error);
        return res.status(500).json(new ApiResponse(500, null, "Server error while removing astrologer from category."));
    }
});

// Controller to get all astrologers by category name
export const getAstrologersByCategoryName = asyncHandler(async (req, res) => {
    const { categoryName } = req.params; // Get category name from the route parameters
    let { page = 1, size = 10 } = req.query; // Get pagination parameters (defaults to page 1, size 10)

    // Convert to integers
    page = parseInt(page);
    size = parseInt(size);

    // Handle case where size is 0, return empty astrologers array
    if (size === 0) {
        return res.status(200).json(new ApiResponse(200, [], "No astrologers to show as size is 0."));
    }

    try {
        // Find the category by its name
        const category = await Category.findOne({ name: categoryName });
        if (!category) {
            return res.status(400).json(new ApiResponse(400, null, "Category not found."));
        }

        // Get the astrologer IDs from the category
        const astrologerIds = category.astrologers;

        if (astrologerIds.length === 0) {
            return res.status(200).json(new ApiResponse(200, [], "No astrologers found in this category."));
        }

        // Calculate pagination parameters

        const totalAstrologers = await Astrologer.countDocuments({ '_id': { $in: astrologerIds }, isOffline: false });
        const totalPages = Math.ceil(totalAstrologers / size); // Calculate total pages
        const skip = (page - 1) * size; // Skip calculation for pagination

        // Fetch the astrologer details with pagination
        const astrologers = await Astrologer.find({ '_id': { $in: astrologerIds }, isOffline: false })
            .skip(skip)
            .limit(size);

        // Return the astrologer details with pagination info and total count
        return res.status(200).json(new ApiResponse(200, {
            astrologers,
            totalFound: totalAstrologers, // Include the total number of astrologers found
            pagination: {
                currentPage: page,
                totalPages: totalPages,
                totalAstrologers: totalAstrologers,
                pageSize: size
            }
        }, "Astrologers retrieved successfully."));
    } catch (error) {
        console.error(error);
        return res.status(500).json(new ApiResponse(500, null, "Server error while fetching astrologers."));
    }
});

export const getAI_AstrologersByCategoryName = asyncHandler(async (req, res) => {
    const { categoryName } = req.params; // Get category name from the route parameters
    let { page = 1, size = 10 } = req.query; // Get pagination parameters (defaults to page 1, size 10)

    // Convert to integers
    page = parseInt(page);
    size = parseInt(size);

    // Handle case where size is 0, return empty astrologers array
    if (size === 0) {
        return res.status(200).json(new ApiResponse(200, [], "No astrologers to show as size is 0."));
    }

    try {
        // Find the category by its name
        const category = await Category.findOne({ name: categoryName });
        if (!category) {
            return res.status(400).json(new ApiResponse(400, null, "Category not found."));
        }

        // Get the astrologer IDs from the category
        const astrologerIds = category.astrologers;

        if (astrologerIds.length === 0) {
            return res.status(200).json(new ApiResponse(200, [], "No astrologers found in this category."));
        }

        // Calculate pagination parameters

        const totalAstrologers = await AI_Astrologer.countDocuments({ '_id': { $in: astrologerIds }, isOffline: false });
        const totalPages = Math.ceil(totalAstrologers / size); // Calculate total pages
        const skip = (page - 1) * size; // Skip calculation for pagination

        // Fetch the astrologer details with pagination
        const astrologers = await Astrologer.find({ '_id': { $in: astrologerIds }, isOffline: false })
            .skip(skip)
            .limit(size);

        // Return the astrologer details with pagination info and total count
        return res.status(200).json(new ApiResponse(200, {
            astrologers,
            totalFound: totalAstrologers, // Include the total number of astrologers found
            pagination: {
                currentPage: page,
                totalPages: totalPages,
                totalAstrologers: totalAstrologers,
                pageSize: size
            }
        }, "Astrologers retrieved successfully."));
    } catch (error) {
        console.error(error);
        return res.status(500).json(new ApiResponse(500, null, "Server error while fetching astrologers."));
    }
});

export const editCategory = asyncHandler(async (req, res) => {
    const { categoryId, newName } = req.body; // Get categoryId and newName from request body

    try {
        // Capitalize the first letter of the new name if it exists
        if (newName && newName.length > 0) {
            newName = newName.charAt(0).toUpperCase() + newName.slice(1);
        }

        // Find the category by its ID
        const category = await Category.findById(categoryId);
        if (!category) {
            return res.status(400).json(new ApiResponse(400, null, "Category not found."));
        }

        // Check if the new category name already exists
        const existingCategory = await Category.findOne({ name: newName });
        if (existingCategory) {
            return res.status(400).json(new ApiResponse(400, null, "Category name already exists."));
        }

        // Update the category name
        category.name = newName;

        // Save the updated category
        await category.save();

        // Return success response
        return res.status(200).json(new ApiResponse(200, category, "Category name updated successfully."));
    } catch (error) {
        console.error(error);
        return res.status(500).json(new ApiResponse(500, null, "Server error while updating category name."));
    }
});

// Controller function to get a list of categories
export const getCategoryList = asyncHandler(async (req, res) => {
    try {
        // Fetch all categories from the database
        const categories = await Category.find();

        // Return success response
        return res.status(200).json(new ApiResponse(200, categories, "Categories retrieved successfully."));
    } catch (error) {
        console.error(error);
        return res.status(500).json(new ApiResponse(500, null, "Server error while fetching categories."));
    }
});


// Controller to reassign an astrologer to a different category
export const reassignAstrologerToCategory = asyncHandler(async (req, res) => {
    const { astrologerId, oldCategoryId, newCategoryId } = req.body; // Get astrologerId, oldCategoryId, and newCategoryId from request body

    try {
        // Find the old category by its ID
        const oldCategory = await Category.findById(oldCategoryId);
        if (!oldCategory) {
            return res.status(400).json(new ApiResponse(400, null, "Old category not found."));
        }

        // Find the new category by its ID
        const newCategory = await Category.findById(newCategoryId);
        if (!newCategory) {
            return res.status(400).json(new ApiResponse(400, null, "New category not found."));
        }

        // Check if the astrologer is in the old category's astrologers list
        if (!oldCategory.astrologers.includes(astrologerId)) {
            return res.status(400).json(new ApiResponse(400, null, "Astrologer not found in the old category."));
        }

        // Remove astrologer from the old category
        oldCategory.astrologers = oldCategory.astrologers.filter(id => id.toString() !== astrologerId);

        // Add astrologer to the new category
        newCategory.astrologers.push(astrologerId);

        // Save both categories
        await oldCategory.save();
        await newCategory.save();

        // Return success response
        return res.status(200).json(new ApiResponse(200, { oldCategory, newCategory }, "Astrologer reassigned to new category successfully."));
    } catch (error) {
        console.error(error);
        return res.status(500).json(new ApiResponse(500, null, "Server error while reassigning astrologer."));
    }
});
