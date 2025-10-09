// Get item ID from URL parameters
const urlParams = new URLSearchParams(window.location.search);
const itemId = urlParams.get('id');

// DOM elements
const loadingState = document.getElementById('loadingState');
const errorState = document.getElementById('errorState');
const editForm = document.getElementById('editForm');
const itemForm = document.getElementById('itemForm');
const viewButton = document.getElementById('viewButton');
const successMessage = document.getElementById('successMessage');
const continueEditingBtn = document.getElementById('continueEditingBtn');

let currentItem = null;
let categories = [];
let collaborators = [];

// Load categories and collaborators
async function loadDropdownData() {
    try {
        const [categoriesResponse, collaboratorsResponse] = await Promise.all([
            fetch('/api/categories'),
            fetch('/api/collaborators')
        ]);

        const categoriesData = await categoriesResponse.json();
        const collaboratorsData = await collaboratorsResponse.json();

        if (categoriesData.success) {
            categories = categoriesData.data;
            populateCategoriesDropdown();
        }

        if (collaboratorsData.success) {
            collaborators = collaboratorsData.data;
            populateCollaboratorsDropdown();
        }
    } catch (error) {
        console.error('Erro ao carregar dados dos dropdowns:', error);
    }
}

function populateCategoriesDropdown() {
    const select = document.getElementById('itemCategory');
    select.innerHTML = '<option value="">Selecione uma categoria</option>';
    
    categories.forEach(category => {
        const option = document.createElement('option');
        option.value = category.id;
        option.textContent = category.nome;
        select.appendChild(option);
    });

    // Add "Create new" option
    const createOption = document.createElement('option');
    createOption.value = 'create_new';
    createOption.textContent = '+ Criar nova categoria';
    createOption.style.fontStyle = 'italic';
    createOption.style.color = '#3B82F6';
    select.appendChild(createOption);
}

function populateCollaboratorsDropdown() {
    const select = document.getElementById('itemCollaborator');
    select.innerHTML = '<option value="">Selecione um colaborador</option>';
    
    collaborators.forEach(collaborator => {
        const option = document.createElement('option');
        option.value = collaborator.id;
        option.textContent = collaborator.nome;
        select.appendChild(option);
    });

    // Add "Create new" option
    const createOption = document.createElement('option');
    createOption.value = 'create_new';
    createOption.textContent = '+ Criar novo colaborador';
    createOption.style.fontStyle = 'italic';
    createOption.style.color = '#3B82F6';
    select.appendChild(createOption);
}

// Handle dropdown changes
document.getElementById('itemCategory').addEventListener('change', function() {
    if (this.value === 'create_new') {
        document.getElementById('categoryModal').classList.remove('hidden');
        this.value = ''; // Reset selection
    }
});

document.getElementById('itemCollaborator').addEventListener('change', function() {
    if (this.value === 'create_new') {
        document.getElementById('collaboratorModal').classList.remove('hidden');
        this.value = ''; // Reset selection
    }
});

// Modal handlers
document.getElementById('closeCategoryModal').addEventListener('click', () => {
    document.getElementById('categoryModal').classList.add('hidden');
});

document.getElementById('cancelCategoryBtn').addEventListener('click', () => {
    document.getElementById('categoryModal').classList.add('hidden');
});

document.getElementById('closeCollaboratorModal').addEventListener('click', () => {
    document.getElementById('collaboratorModal').classList.add('hidden');
});

document.getElementById('cancelCollaboratorBtn').addEventListener('click', () => {
    document.getElementById('collaboratorModal').classList.add('hidden');
});

// Category form submission
document.getElementById('categoryForm').addEventListener('submit', async (e) => {
    e.preventDefault();
    
    const formData = new FormData(e.target);
    const categoryData = {
        nome: formData.get('nome')
    };

    try {
        const response = await fetch('/api/categories', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json'
            },
            body: JSON.stringify(categoryData)
        });

        const result = await response.json();

        if (result.success) {
            // Add new category to the list
            categories.push(result.data);
            populateCategoriesDropdown();
            
            // Select the new category
            document.getElementById('itemCategory').value = result.data.id;
            
            // Close modal and reset form
            document.getElementById('categoryModal').classList.add('hidden');
            document.getElementById('categoryForm').reset();
        } else {
            alert('Erro ao criar categoria: ' + result.message);
        }
    } catch (error) {
        console.error('Erro ao criar categoria:', error);
        alert('Erro ao criar categoria');
    }
});

// Collaborator form submission
document.getElementById('collaboratorForm').addEventListener('submit', async (e) => {
    e.preventDefault();
    
    const formData = new FormData(e.target);
    const collaboratorData = {
        nome: formData.get('nome'),
        email: formData.get('email'),
        cargo: formData.get('cargo')
    };

    try {
        const response = await fetch('/api/collaborators', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json'
            },
            body: JSON.stringify(collaboratorData)
        });

        const result = await response.json();

        if (result.success) {
            // Add new collaborator to the list
            collaborators.push(result.data);
            populateCollaboratorsDropdown();
            
            // Select the new collaborator
            document.getElementById('itemCollaborator').value = result.data.id;
            
            // Close modal and reset form
            document.getElementById('collaboratorModal').classList.add('hidden');
            document.getElementById('collaboratorForm').reset();
        } else {
            alert('Erro ao criar colaborador: ' + result.message);
        }
    } catch (error) {
        console.error('Erro ao criar colaborador:', error);
        alert('Erro ao criar colaborador');
    }
});

// Load item data
async function loadItem() {
    if (!itemId) {
        showError('ID do item não fornecido');
        return;
    }

    try {
        const response = await fetch(`/api/items/${itemId}`);
        const data = await response.json();

        if (!response.ok || !data.success) {
            throw new Error(data.message || 'Erro ao carregar item');
        }

        currentItem = data.data;
        populateForm(currentItem);
    } catch (error) {
        console.error('Erro ao carregar item:', error);
        showError('Erro ao carregar item: ' + error.message);
    }
}

function showError(message) {
    loadingState.classList.add('hidden');
    errorState.classList.remove('hidden');
    document.getElementById('errorMessage').textContent = message;
}

function populateForm(item) {
    loadingState.classList.add('hidden');
    editForm.classList.remove('hidden');

    // Set title
    document.getElementById('itemTitle').textContent = item.module_data?.name || item.name || 'Item';

    // Set view button link
    viewButton.onclick = () => window.location.href = `view-item.html?id=${item.id}`;

    // Populate form fields
    document.getElementById('itemName').value = item.module_data?.name || item.name || '';
    document.getElementById('itemDescription').value = item.module_data?.description || item.description || '';
    document.getElementById('itemCompany').value = item.module_data?.company || '';
    document.getElementById('itemLocation').value = item.module_data?.location || item.location || '';
    document.getElementById('itemStatus').value = item.module_data?.status || item.status || 'Ativo';
    document.getElementById('itemBrand').value = item.module_data?.brand || '';
    document.getElementById('itemModel').value = item.module_data?.model || '';
    document.getElementById('itemSerial').value = item.module_data?.serial_number || '';
    document.getElementById('itemValue').value = item.module_data?.value || '';

    // Set category and collaborator after dropdowns are loaded
    if (item.module_data?.categoria_id) {
        document.getElementById('itemCategory').value = item.module_data.categoria_id;
    }
    if (item.module_data?.colaborador_id) {
        document.getElementById('itemCollaborator').value = item.module_data.colaborador_id;
    }

    // Handle dates
    if (item.module_data?.purchase_date) {
        document.getElementById('itemPurchaseDate').value = item.module_data.purchase_date.split('T')[0];
    }
    if (item.module_data?.warranty_date) {
        document.getElementById('itemWarrantyDate').value = item.module_data.warranty_date.split('T')[0];
    }

    // Show current image if exists
    if (item.module_data?.image) {
        document.getElementById('currentImageContainer').classList.remove('hidden');
        document.getElementById('currentImage').src = item.module_data.image;
    }
}

// Handle form submission
itemForm.addEventListener('submit', async (e) => {
    e.preventDefault();
    
    const saveButton = document.getElementById('saveButton');
    const originalText = saveButton.innerHTML;
    saveButton.innerHTML = '<i class="fas fa-spinner fa-spin mr-2"></i>Salvando...';
    saveButton.disabled = true;

    try {
        const formData = new FormData(itemForm);
        
        // Update item using FormData (multipart/form-data)
        const response = await fetch(`/api/items/${itemId}`, {
            method: 'PUT',
            body: formData // Send FormData directly, don't set Content-Type header
        });

        const result = await response.json();

        if (!response.ok || !result.success) {
            throw new Error(result.message || 'Erro ao salvar item');
        }

        // Show success message
        successMessage.classList.remove('hidden');

    } catch (error) {
        console.error('Erro ao salvar item:', error);
        alert('Erro ao salvar item: ' + error.message);
    } finally {
        saveButton.innerHTML = originalText;
        saveButton.disabled = false;
    }
});

// Handle continue editing
continueEditingBtn.addEventListener('click', () => {
    successMessage.classList.add('hidden');
    // Reload the item to get updated data
    loadItem();
});

// Initialize
async function init() {
    await loadDropdownData();
    await loadItem();
}

init();